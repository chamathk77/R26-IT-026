const mongoose = require("mongoose");
const Payments = require("../../models/payments");
const ShopsData = require("../../models/shopsData");
const {
  formatPaymentRecord,
  formatShopSummary,
  findShopByShopId,
} = require("../../utils/paymentResponseHelper");
const { addDays } = require("../../utils/trialHelper");
const {
  clearShopUserTokens,
} = require("../../services/trialExpirationService");
const { sendSms } = require("../../services/smsService");

const { PAYMENT_STATUS, PAYMENT_TYPE } = Payments;
const REVIEWABLE_STATUS = "pending";
const ADMIN_SETTABLE_STATUSES = ["approve", "rejected"];

const { SUBSCRIPTION_TYPES } = ShopsData;
const MULTI_MONTH_SUBSCRIPTION_TYPES = ["3months", "6months", "1year"];
const ONE_MONTH_SUBSCRIPTION_TYPE = "1month";

const SUBSCRIPTION_DURATION_DAYS = {
  "1month": 30,
  "3months": 90,
  "6months": 180,
  "1year": 360,
};

const SUBSCRIPTION_RENEWAL_STATUSES = [
  "due",
  "paymentPending",
  "diactiveByAdmin",
];

const PENDING_PAYMENTS_DEFAULT_PAGE = 1;
const PENDING_PAYMENTS_DEFAULT_LIMIT = 20;
const PENDING_PAYMENTS_MAX_LIMIT = 20;

const ONBOARDING_PAYMENT_TYPES = ["subscription", "upFront"];

const DEFAULT_MAX_USERS = 3;

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePaymentTypeFilter(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { paymentType: null };
  }

  const normalized = String(value).trim();
  if (normalized === "upfront") {
    return { paymentType: "upFront" };
  }
  if (PAYMENT_TYPE.includes(normalized)) {
    return { paymentType: normalized };
  }

  return {
    error: `paymentType must be one of: ${PAYMENT_TYPE.join(", ")}`,
  };
}

function normalizeOnboardingPaymentTypeFilter(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { paymentType: null };
  }

  const normalized = String(value).trim();
  if (normalized === "upfront") {
    return { paymentType: "upFront" };
  }
  if (ONBOARDING_PAYMENT_TYPES.includes(normalized)) {
    return { paymentType: normalized };
  }

  return {
    error: `paymentType must be one of: ${ONBOARDING_PAYMENT_TYPES.join(", ")}`,
  };
}

function normalizePaymentStatusFilter(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { status: null };
  }

  const normalized = String(value).trim();
  if (PAYMENT_STATUS.includes(normalized)) {
    return { status: normalized };
  }

  return {
    error: `status must be one of: ${PAYMENT_STATUS.join(", ")}`,
  };
}

function mapOnboardingPaymentListItem(payment, shop, req) {
  const formatted = formatPaymentRecord(payment, req);
  return {
    _id: formatted._id,
    shopId: formatted.shopId,
    receiptNumber: formatted.receiptNumber,
    receiptImagePath: formatted.receiptImagePath,
    receiptImageUrl: formatted.receiptImageUrl,
    receiptImageAvailable: formatted.receiptImageAvailable,
    paymentType: formatted.paymentType,
    paymentAmount: formatted.paymentAmount,
    subscriptionType: formatted.subscriptionType ?? null,
    IsOnboaringPayment: formatted.IsOnboaringPayment ?? true,
    submittedDate: formatted.submittedDate,
    paymentMonth: formatted.paymentMonth,
    exactPaymentDay: formatted.exactPaymentDay,
    status: formatted.status,
    reason: formatted.reason,
    description: formatted.description ?? null,
    createdAt: formatted.createdAt,
    updatedAt: formatted.updatedAt,
    shop: shop
      ? {
          shopId: shop.shopId,
          shopName: shop.shopName,
          ownerFirstName: shop.ownerFirstName,
          ownerLastName: shop.ownerLastName,
          shopMobileNumber: shop.shopMobileNumber,
          email: shop.email,
          status: shop.status,
        }
      : null,
  };
}

function mapSubscriptionPaymentListItem(payment, shop, req) {
  const formatted = formatPaymentRecord(payment, req);
  return {
    _id: formatted._id,
    shopId: formatted.shopId,
    shopStatus: shop?.status ?? null,
    subscriptionDueDays: shop?.subscriptionDueDays ?? 0,
    receiptNumber: formatted.receiptNumber,
    receiptImagePath: formatted.receiptImagePath,
    receiptImageUrl: formatted.receiptImageUrl,
    receiptImageAvailable: formatted.receiptImageAvailable,
    paymentType: formatted.paymentType,
    paymentAmount: formatted.paymentAmount,
    subscriptionType: formatted.subscriptionType ?? null,
    IsOnboaringPayment: formatted.IsOnboaringPayment ?? false,
    submittedDate: formatted.submittedDate,
    paymentMonth: formatted.paymentMonth,
    exactPaymentDay: formatted.exactPaymentDay,
    expiryDate: formatted.expiryDate ?? null,
    status: formatted.status,
    reason: formatted.reason,
    description: formatted.description ?? null,
    createdAt: formatted.createdAt,
    updatedAt: formatted.updatedAt,
    shop: shop
      ? {
          shopId: shop.shopId,
          shopName: shop.shopName,
          ownerFirstName: shop.ownerFirstName,
          ownerLastName: shop.ownerLastName,
          shopMobileNumber: shop.shopMobileNumber,
          email: shop.email,
          status: shop.status,
          subscriptionDueDays: shop.subscriptionDueDays ?? 0,
        }
      : null,
  };
}

const listPendingPayments = async (req, res) => {
  try {
    const typeFilter = normalizePaymentTypeFilter(req.query.paymentType);
    if (typeFilter.error) {
      return res.status(400).json({
        success: false,
        message: typeFilter.error,
        allowedPaymentTypes: PAYMENT_TYPE,
      });
    }

    const query = { status: REVIEWABLE_STATUS };
    if (typeFilter.paymentType) {
      query.paymentType = typeFilter.paymentType;
    }

    const page = parsePositiveInt(req.query.page, PENDING_PAYMENTS_DEFAULT_PAGE);
    const limit = Math.min(
      parsePositiveInt(req.query.limit, PENDING_PAYMENTS_DEFAULT_LIMIT),
      PENDING_PAYMENTS_MAX_LIMIT,
    );
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payments.find(query)
        .sort({ submittedDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payments.countDocuments(query),
    ]);

    const shopIds = [...new Set(payments.map((p) => p.shopId))];
    const shops = await ShopsData.find({ shopId: { $in: shopIds } }).lean();
    const shopById = new Map(shops.map((s) => [s.shopId, s]));

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
      count: payments.length,
      paymentType: typeFilter.paymentType,
      allowedPaymentTypes: PAYMENT_TYPE,
      payments: payments.map((payment) => {
        const shop = shopById.get(payment.shopId);
        const formatted = formatPaymentRecord(payment, req);
        return {
          _id: formatted._id,
          shopId: formatted.shopId,
          receiptNumber: formatted.receiptNumber,
          receiptImagePath: formatted.receiptImagePath,
          receiptImageUrl: formatted.receiptImageUrl,
          receiptImageAvailable: formatted.receiptImageAvailable,
          paymentType: formatted.paymentType,
          paymentAmount: formatted.paymentAmount,
          subscriptionType: formatted.subscriptionType ?? null,
          submittedDate: formatted.submittedDate,
          paymentMonth: formatted.paymentMonth,
          exactPaymentDay: formatted.exactPaymentDay,
          status: formatted.status,
          reason: formatted.reason,
          createdAt: formatted.createdAt,
          updatedAt: formatted.updatedAt,
          shop: shop
            ? {
                shopId: shop.shopId,
                shopName: shop.shopName,
                ownerFirstName: shop.ownerFirstName,
                ownerLastName: shop.ownerLastName,
                shopMobileNumber: shop.shopMobileNumber,
                email: shop.email,
                status: shop.status,
              }
            : null,
        };
      }),
    });
  } catch (error) {
    console.log("error in listPendingPayments", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getOnboardingPayments = async (req, res) => {
  try {
    const typeFilter = normalizeOnboardingPaymentTypeFilter(req.query.paymentType);
    if (typeFilter.error) {
      return res.status(400).json({
        success: false,
        message: typeFilter.error,
        allowedPaymentTypes: ONBOARDING_PAYMENT_TYPES,
      });
    }

    const statusFilter = normalizePaymentStatusFilter(req.query.status);
    if (statusFilter.error) {
      return res.status(400).json({
        success: false,
        message: statusFilter.error,
        allowedStatuses: PAYMENT_STATUS,
      });
    }

    const query = { IsOnboaringPayment: true };
    if (typeFilter.paymentType) {
      query.paymentType = typeFilter.paymentType;
    }
    if (statusFilter.status) {
      query.status = statusFilter.status;
    }

    const page = parsePositiveInt(req.query.page, PENDING_PAYMENTS_DEFAULT_PAGE);
    const limit = Math.min(
      parsePositiveInt(req.query.limit, PENDING_PAYMENTS_DEFAULT_LIMIT),
      PENDING_PAYMENTS_MAX_LIMIT,
    );
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payments.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payments.countDocuments(query),
    ]);

    const shopIds = [...new Set(payments.map((p) => p.shopId))];
    const shops = await ShopsData.find({ shopId: { $in: shopIds } }).lean();
    const shopById = new Map(shops.map((s) => [s.shopId, s]));

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
      count: payments.length,
      paymentType: typeFilter.paymentType,
      status: statusFilter.status,
      allowedPaymentTypes: ONBOARDING_PAYMENT_TYPES,
      allowedStatuses: PAYMENT_STATUS,
      payments: payments.map((payment) =>
        mapOnboardingPaymentListItem(payment, shopById.get(payment.shopId), req),
      ),
    });
  } catch (error) {
    console.log("error in getOnboardingPayments", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSubscriptionPayments = async (req, res) => {
  try {
    const statusFilter = normalizePaymentStatusFilter(req.query.status);
    if (statusFilter.error) {
      return res.status(400).json({
        success: false,
        message: statusFilter.error,
        allowedStatuses: PAYMENT_STATUS,
      });
    }

    const query = {
      paymentType: "subscription",
      IsOnboaringPayment: false,
    };
    if (statusFilter.status) {
      query.status = statusFilter.status;
    }

    const page = parsePositiveInt(req.query.page, PENDING_PAYMENTS_DEFAULT_PAGE);
    const limit = Math.min(
      parsePositiveInt(req.query.limit, PENDING_PAYMENTS_DEFAULT_LIMIT),
      PENDING_PAYMENTS_MAX_LIMIT,
    );
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payments.find(query)
        .sort({ submittedDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payments.countDocuments(query),
    ]);

    const shopIds = [...new Set(payments.map((p) => p.shopId))];
    const shops = await ShopsData.find({ shopId: { $in: shopIds } })
      .select(
        "shopId shopName ownerFirstName ownerLastName shopMobileNumber email status subscriptionDueDays",
      )
      .lean();
    const shopById = new Map(shops.map((s) => [s.shopId, s]));

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
      count: payments.length,
      status: statusFilter.status,
      allowedStatuses: PAYMENT_STATUS,
      payments: payments.map((payment) =>
        mapSubscriptionPaymentListItem(payment, shopById.get(payment.shopId), req),
      ),
    });
  } catch (error) {
    console.log("error in getSubscriptionPayments", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment id" });
    }

    const payment = await Payments.findById(paymentId).lean();
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    const shop = await findShopByShopId(payment.shopId);

    res.status(200).json({
      success: true,
      payment: formatPaymentRecord(payment, req),
      shop: formatShopSummary(shop),
    });
  } catch (error) {
    console.log("error in getPaymentDetails", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function validateUpfrontApproveScenario(shop) {
  if (shop.isOneTimePaymentDone) {
    return {
      error: "Upfront payment has already been approved for this shop",
      shopStatus: shop.status,
    };
  }

  return {};
}

async function applyShopUpdatesOnUpfrontApprove(shop) {
  shop.status = "initialPaymentApproved";
  shop.isTrailCompleted = true;
  shop.isOneTimePaymentDone = true;
  await shop.save();
}

function matchesSubscriptionReceiptNo(shop, paymentId) {
  const receiptNo = shop.subscriptionReceiptNo
    ? String(shop.subscriptionReceiptNo).trim()
    : "";
  return receiptNo === String(paymentId);
}

function validateSubscriptionApproveScenario(shop, paymentId) {
  if (!matchesSubscriptionReceiptNo(shop, paymentId)) {
    return {
      error: "Payment id does not match shop subscription receipt reference",
    };
  }

  const subscriptionType = shop.subscriptionType;
  if (!subscriptionType || !SUBSCRIPTION_TYPES.includes(subscriptionType)) {
    return {
      error:
        "Shop subscription type must be set before approving subscription payment",
    };
  }

  if (shop.nextPaymentDate == null) {
    return {
      error:
        "Shop next payment date is required for subscription renewal approval",
    };
  }

  const shopStatus = shop.status;
  if (!SUBSCRIPTION_RENEWAL_STATUSES.includes(shopStatus)) {
    return {
      error: `Subscription renewal requires shop status due, paymentPending, or diactiveByAdmin (current: ${shopStatus})`,
      shopStatus,
      subscriptionType,
    };
  }

  if (subscriptionType === ONE_MONTH_SUBSCRIPTION_TYPE) {
    return { scenario: "oneMonthRenewal" };
  }

  if (MULTI_MONTH_SUBSCRIPTION_TYPES.includes(subscriptionType)) {
    return { scenario: "multiMonthRenewal" };
  }

  return {
    error: `Unsupported subscription type: ${subscriptionType}`,
    subscriptionType,
  };
}

function validateSubscriptionRejectScenario(shop, paymentId) {
  if (!matchesSubscriptionReceiptNo(shop, paymentId)) {
    return {
      error: "Payment id does not match shop subscription receipt reference",
    };
  }

  return {};
}

async function applyShopUpdatesOnSubscriptionApprove(shop, payment, scenario) {
  const subscriptionType = shop.subscriptionType;
  const durationDays = SUBSCRIPTION_DURATION_DAYS[subscriptionType];
  if (!durationDays) {
    const err = new Error(
      `Subscription duration is not configured for plan ${subscriptionType}`,
    );
    err.code = "SUBSCRIPTION_APPROVE_SCENARIO";
    throw err;
  }

  const paymentDoneDate = payment.submittedDate
    ? new Date(payment.submittedDate)
    : new Date();

  switch (scenario) {
    case "multiMonthRenewal":
    case "oneMonthRenewal": {
      shop.nextPaymentDate = startOfDay(
        addDays(startOfDay(shop.nextPaymentDate), durationDays),
      );
      shop.currentPaymentDoneDate = paymentDoneDate;
      shop.status = "active";
      break;
    }
    default:
      throw new Error("Unhandled subscription approval scenario");
  }

  await shop.save();
}

function validateResetAndApproveSubscriptionScenario(shop, paymentId) {
  if (!matchesSubscriptionReceiptNo(shop, paymentId)) {
    return {
      error: "Payment id does not match shop subscription receipt reference",
    };
  }

  const subscriptionType = shop.subscriptionType;
  if (!subscriptionType || !SUBSCRIPTION_TYPES.includes(subscriptionType)) {
    return {
      error:
        "Shop subscription type must be set before approving subscription payment",
      subscriptionType: subscriptionType ?? null,
    };
  }

  const shopStatus = shop.status;
  const resetApproveStatuses = ["paymentPending", "diactiveByAdmin"];

  if (!resetApproveStatuses.includes(shopStatus)) {
    return {
      error: `Reset subscription approval requires shop status paymentPending or diactiveByAdmin (current: ${shopStatus}). Use regular subscription approval for due shops.`,
      shopStatus,
      subscriptionType,
    };
  }

  if (subscriptionType === ONE_MONTH_SUBSCRIPTION_TYPE) {
    return { scenario: "oneMonthResetApprove" };
  }

  if (MULTI_MONTH_SUBSCRIPTION_TYPES.includes(subscriptionType)) {
    return { scenario: "multiMonthResetApprove" };
  }

  return {
    error: `Unsupported subscription type: ${subscriptionType}`,
    subscriptionType,
  };
}

async function applyShopUpdatesOnResetSubscriptionApprove(shop, payment) {
  const subscriptionType = shop.subscriptionType;
  const durationDays = SUBSCRIPTION_DURATION_DAYS[subscriptionType];
  if (!durationDays) {
    const err = new Error(
      `Subscription duration is not configured for plan ${subscriptionType}`,
    );
    err.code = "SUBSCRIPTION_RESET_APPROVE_SCENARIO";
    throw err;
  }

  const paymentDoneDate = payment.submittedDate
    ? new Date(payment.submittedDate)
    : new Date();
  const cycleStart = startOfDay();

  shop.nextPaymentDate = startOfDay(addDays(cycleStart, durationDays));
  shop.currentPaymentDoneDate = paymentDoneDate;
  shop.status = "active";
  shop.subscriptionDueDays = 0;

  await shop.save();
}

function validateFirstMultiMonthSubscriptionPayment(shop, payment, paymentId) {
  const subscriptionType = shop.subscriptionType;

  if (
    !subscriptionType ||
    !MULTI_MONTH_SUBSCRIPTION_TYPES.includes(subscriptionType)
  ) {
    return {
      error:
        "Shop subscription type must be 3months, 6months, or 1year for this action",
      subscriptionType: subscriptionType ?? null,
    };
  }

  if (
    payment.subscriptionType &&
    payment.subscriptionType !== subscriptionType
  ) {
    return {
      error: "Payment subscription type does not match shop subscription type",
      subscriptionType,
      paymentSubscriptionType: payment.subscriptionType,
    };
  }

  if (!matchesSubscriptionReceiptNo(shop, paymentId)) {
    return {
      error: "Payment id does not match shop subscription receipt reference",
    };
  }

  if (shop.subscriptionStartDate != null) {
    return {
      error:
        "Shop subscription start date is already set. Use subscription renewal approval instead.",
      subscriptionStartDate: shop.subscriptionStartDate,
    };
  }

  if (shop.nextPaymentDate != null) {
    return {
      error:
        "Shop next payment date is already set. Use subscription renewal approval instead.",
      nextPaymentDate: shop.nextPaymentDate,
    };
  }

  return { subscriptionType };
}

async function applyShopUpdatesOnFirstMultiMonthSubscriptionApprove(shop) {
  const subscriptionType = shop.subscriptionType;
  const durationDays = SUBSCRIPTION_DURATION_DAYS[subscriptionType];
  if (!durationDays) {
    const err = new Error(
      `Subscription duration is not configured for plan ${subscriptionType}`,
    );
    err.code = "FIRST_MULTI_MONTH_SUBSCRIPTION_APPROVE";
    throw err;
  }

  const today = startOfDay();

  shop.subscriptionStartDate = today;
  shop.currentPaymentDoneDate = today;
  shop.nextPaymentDate = startOfDay(addDays(today, durationDays));
  shop.status = "active";

  await shop.save();
}

function getShopCustomerMobile(shop) {
  return shop.ownerMobileNumber?.trim() || shop.shopMobileNumber?.trim() || "";
}

function formatPaymentTypeSmsLabel(paymentType) {
  return paymentType === "upFront"
    ? "Up-front payment"
    : "Subscription payment";
}

function formatSubscriptionTypeSmsLabel(subscriptionType) {
  const labels = {
    "1month": "monthly subscription",
    "3months": "3 month subscription",
    "6months": "6 month subscription",
    "1year": "1 year subscription",
  };
  return labels[subscriptionType] || "subscription";
}

function resolveSubscriptionTypeForSms(shop, payment) {
  return shop.subscriptionType || payment.subscriptionType || null;
}

function formatSubscriptionActionMessage(subscriptionType, action, isRenewal) {
  const label = formatSubscriptionTypeSmsLabel(subscriptionType);
  const kind = isRenewal ? "renewal" : "payment";
  if (action === "approve") {
    return `Your ${label} ${kind} has been approved`;
  }
  return `Your ${label} ${kind} has been rejected`;
}

function buildSubscriptionPaymentApprovedSms({
  receiptNumber,
  subscriptionType,
  isRenewal,
}) {
  const label = formatSubscriptionTypeSmsLabel(subscriptionType);
  const kind = isRenewal ? "renewal" : "payment";
  return `Smart Cost: Your ${label} ${kind} has been approved. Receipt: ${receiptNumber}. Thank you for using Smart Cost.`;
}

function buildSubscriptionPaymentRejectedSms({
  receiptNumber,
  subscriptionType,
  reason,
  isRenewal,
}) {
  const label = formatSubscriptionTypeSmsLabel(subscriptionType);
  const kind = isRenewal ? "renewal" : "payment";
  return `Smart Cost: Your ${label} ${kind} (Receipt: ${receiptNumber}) was rejected. Reason: ${reason}. Please resubmit your payment in the app.`;
}

async function sendSubscriptionPaymentApprovedSms(
  shop,
  payment,
  { isRenewal = false } = {},
) {
  const mobile = getShopCustomerMobile(shop);
  if (!mobile) {
    return { sent: false, reason: "Shop owner mobile number is not set" };
  }

  const subscriptionType = resolveSubscriptionTypeForSms(shop, payment);

  try {
    await sendSms({
      to: mobile,
      message: buildSubscriptionPaymentApprovedSms({
        receiptNumber: payment.receiptNumber,
        subscriptionType,
        isRenewal,
      }),
    });
    return { sent: true };
  } catch (error) {
    console.log("error in sendSubscriptionPaymentApprovedSms", error.message);
    return { sent: false, reason: error.message || "SMS send failed" };
  }
}

async function sendSubscriptionPaymentRejectedSms(
  shop,
  payment,
  reason,
  { isRenewal = false } = {},
) {
  const mobile = getShopCustomerMobile(shop);
  if (!mobile) {
    return { sent: false, reason: "Shop owner mobile number is not set" };
  }

  const subscriptionType = resolveSubscriptionTypeForSms(shop, payment);

  try {
    await sendSms({
      to: mobile,
      message: buildSubscriptionPaymentRejectedSms({
        receiptNumber: payment.receiptNumber,
        subscriptionType,
        reason,
        isRenewal,
      }),
    });
    return { sent: true };
  } catch (error) {
    console.log("error in sendSubscriptionPaymentRejectedSms", error.message);
    return { sent: false, reason: error.message || "SMS send failed" };
  }
}

function buildUpfrontPaymentApprovedSms({ receiptNumber }) {
  return `Smart Cost: Your upfront payment has been approved. Receipt: ${receiptNumber}. Please log in to the app and select a subscription plan to continue.`;
}

async function sendUpfrontPaymentApprovedSms(shop, payment) {
  const mobile = getShopCustomerMobile(shop);
  if (!mobile) {
    return { sent: false, reason: "Shop owner mobile number is not set" };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildUpfrontPaymentApprovedSms({
        receiptNumber: payment.receiptNumber,
      }),
    });
    return { sent: true };
  } catch (error) {
    console.log("error in sendUpfrontPaymentApprovedSms", error.message);
    return { sent: false, reason: error.message || "SMS send failed" };
  }
}

function buildPaymentApprovedSms({ receiptNumber, paymentType }) {
  const typeLabel = formatPaymentTypeSmsLabel(paymentType);
  return `Smart Cost: Your ${typeLabel.toLowerCase()} invoice has been approved. Receipt: ${receiptNumber}. Thank you for using Smart Cost.`;
}

async function sendPaymentApprovedSms(shop, payment) {
  const mobile = getShopCustomerMobile(shop);
  if (!mobile) {
    return { sent: false, reason: "Shop owner mobile number is not set" };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildPaymentApprovedSms({
        receiptNumber: payment.receiptNumber,
        paymentType: payment.paymentType,
      }),
    });
    return { sent: true };
  } catch (error) {
    console.log("error in sendPaymentApprovedSms", error.message);
    return { sent: false, reason: error.message || "SMS send failed" };
  }
}

function buildPaymentRejectedSms({ receiptNumber, paymentType, reason }) {
  const typeLabel = formatPaymentTypeSmsLabel(paymentType);
  return `Smart Cost: Your ${typeLabel.toLowerCase()} invoice (Receipt: ${receiptNumber}) was rejected. Reason: ${reason}. Please resubmit your payment in the app.`;
}

async function sendPaymentRejectedSms(shop, payment, reason) {
  const mobile = getShopCustomerMobile(shop);
  if (!mobile) {
    return { sent: false, reason: "Shop owner mobile number is not set" };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildPaymentRejectedSms({
        receiptNumber: payment.receiptNumber,
        paymentType: payment.paymentType,
        reason,
      }),
    });
    return { sent: true };
  } catch (error) {
    console.log("error in sendPaymentRejectedSms", error.message);
    return { sent: false, reason: error.message || "SMS send failed" };
  }
}

const rejectUpfrontPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    if (!isValidObjectId(paymentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment id" });
    }

    const reasonTrimmed = reason != null ? String(reason).trim() : "";
    if (!reasonTrimmed) {
      return res.status(400).json({
        success: false,
        message: "Reason is required when rejecting a payment",
      });
    }

    const payment = await Payments.findById(paymentId);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.paymentType !== "upFront") {
      return res.status(400).json({
        success: false,
        message: "Only upfront payments can be rejected with this action",
        paymentType: payment.paymentType,
      });
    }

    if (payment.status !== REVIEWABLE_STATUS) {
      return res.status(400).json({
        success: false,
        message: `Only payments with status "${REVIEWABLE_STATUS}" can be rejected`,
        currentStatus: payment.status,
      });
    }

    const shop = await ShopsData.findOne({ shopId: payment.shopId });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found for this payment" });
    }

    payment.status = "rejected";
    payment.reason = reasonTrimmed;
    await payment.save();

    const rejectionSmsResult = await sendPaymentRejectedSms(
      shop,
      payment,
      reasonTrimmed,
    );
    if (!rejectionSmsResult.sent) {
      console.log("payment rejected SMS not sent", rejectionSmsResult.reason);
    }

    res.status(200).json({
      success: true,
      message: "Upfront payment rejected",
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: formatShopSummary(shop.toObject()),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log("error in rejectUpfrontPayment", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const approveUpfrontPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment id" });
    }

    const payment = await Payments.findById(paymentId);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.paymentType !== "upFront") {
      return res.status(400).json({
        success: false,
        message: "Only upfront payments can be approved with this action",
        paymentType: payment.paymentType,
      });
    }

    if (payment.status !== REVIEWABLE_STATUS) {
      return res.status(400).json({
        success: false,
        message: `Only payments with status "${REVIEWABLE_STATUS}" can be approved`,
        currentStatus: payment.status,
      });
    }

    const shop = await ShopsData.findOne({ shopId: payment.shopId });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found for this payment" });
    }

    const scenarioCheck = validateUpfrontApproveScenario(shop);
    if (scenarioCheck.error) {
      return res.status(400).json({
        success: false,
        message: scenarioCheck.error,
        ...(scenarioCheck.shopStatus && {
          shopStatus: scenarioCheck.shopStatus,
        }),
      });
    }

    payment.status = "approve";
    payment.reason = null;
    if (!payment.exactPaymentDay) {
      payment.exactPaymentDay = startOfDay(payment.submittedDate || new Date());
    }

    await applyShopUpdatesOnUpfrontApprove(shop);
    await payment.save();

    const usersLoggedOut = await clearShopUserTokens(shop.shopId);

    const approvalSmsResult = await sendUpfrontPaymentApprovedSms(
      shop,
      payment,
    );
    if (!approvalSmsResult.sent) {
      console.log("payment approved SMS not sent", approvalSmsResult.reason);
    }

    res.status(200).json({
      success: true,
      message:
        "Upfront payment approved. Shop status updated to initialPaymentApproved.",
      usersLoggedOut,
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: formatShopSummary(shop.toObject()),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log("error in approveUpfrontPayment", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const approveSubscriptionPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment id" });
    }

    const payment = await Payments.findById(paymentId);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.paymentType !== "subscription") {
      return res.status(400).json({
        success: false,
        message: "Only subscription payments can be approved with this action",
        paymentType: payment.paymentType,
      });
    }

    if (payment.status !== REVIEWABLE_STATUS) {
      return res.status(400).json({
        success: false,
        message: `Only payments with status "${REVIEWABLE_STATUS}" can be approved`,
        currentStatus: payment.status,
      });
    }

    const shop = await ShopsData.findOne({ shopId: payment.shopId });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found for this payment" });
    }

    const scenarioCheck = validateSubscriptionApproveScenario(shop, paymentId);
    if (scenarioCheck.error) {
      return res.status(400).json({
        success: false,
        message: scenarioCheck.error,
        ...(scenarioCheck.shopStatus && {
          shopStatus: scenarioCheck.shopStatus,
        }),
        ...(scenarioCheck.subscriptionType && {
          subscriptionType: scenarioCheck.subscriptionType,
        }),
      });
    }

    payment.status = "approve";
    payment.reason = null;
    if (!payment.exactPaymentDay) {
      payment.exactPaymentDay = startOfDay(payment.submittedDate || new Date());
    }

    await applyShopUpdatesOnSubscriptionApprove(
      shop,
      payment,
      scenarioCheck.scenario,
    );
    await payment.save();

    const approvalSmsResult = await sendSubscriptionPaymentApprovedSms(
      shop,
      payment,
      { isRenewal: true },
    );
    if (!approvalSmsResult.sent) {
      console.log(
        "subscription payment approved SMS not sent",
        approvalSmsResult.reason,
      );
    }

    const subscriptionType = resolveSubscriptionTypeForSms(shop, payment);

    res.status(200).json({
      success: true,
      message: formatSubscriptionActionMessage(
        subscriptionType,
        "approve",
        true,
      ),
      scenario: scenarioCheck.scenario,
      customerSms: approvalSmsResult,
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: formatShopSummary(shop.toObject()),
    });
  } catch (error) {
    if (error.code === "SUBSCRIPTION_APPROVE_SCENARIO") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === "SUBSCRIPTION_APPROVE_PENDING_USERS") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log("error in approveSubscriptionPayment", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetAndApproveSubscriptionPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment id" });
    }

    const payment = await Payments.findById(paymentId);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.paymentType !== "subscription") {
      return res.status(400).json({
        success: false,
        message: "Only subscription payments can be approved with this action",
        paymentType: payment.paymentType,
      });
    }

    if (payment.status !== REVIEWABLE_STATUS) {
      return res.status(400).json({
        success: false,
        message: `Only payments with status "${REVIEWABLE_STATUS}" can be approved`,
        currentStatus: payment.status,
      });
    }

    const shop = await ShopsData.findOne({ shopId: payment.shopId });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found for this payment" });
    }

    const scenarioCheck = validateResetAndApproveSubscriptionScenario(
      shop,
      paymentId,
    );
    if (scenarioCheck.error) {
      return res.status(400).json({
        success: false,
        message: scenarioCheck.error,
        ...(scenarioCheck.shopStatus && {
          shopStatus: scenarioCheck.shopStatus,
        }),
        ...(scenarioCheck.subscriptionType && {
          subscriptionType: scenarioCheck.subscriptionType,
        }),
      });
    }

    payment.status = "approve";
    payment.reason = null;
    if (!payment.exactPaymentDay) {
      payment.exactPaymentDay = startOfDay(payment.submittedDate || new Date());
    }

    await applyShopUpdatesOnResetSubscriptionApprove(shop, payment);
    await payment.save();

    const approvalSmsResult = await sendSubscriptionPaymentApprovedSms(
      shop,
      payment,
      { isRenewal: true },
    );
    if (!approvalSmsResult.sent) {
      console.log(
        "reset subscription payment approved SMS not sent",
        approvalSmsResult.reason,
      );
    }

    const subscriptionType = resolveSubscriptionTypeForSms(shop, payment);

    res.status(200).json({
      success: true,
      message: formatSubscriptionActionMessage(
        subscriptionType,
        "approve",
        true,
      ),
      scenario: scenarioCheck.scenario,
      billingCycleReset: true,
      nextPaymentDate: shop.nextPaymentDate,
      customerSms: approvalSmsResult,
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: formatShopSummary(shop.toObject()),
    });
  } catch (error) {
    if (error.code === "SUBSCRIPTION_RESET_APPROVE_SCENARIO") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === "SUBSCRIPTION_APPROVE_PENDING_USERS") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log("error in resetAndApproveSubscriptionPayment", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const approveFirstMultiMonthSubscriptionPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment id" });
    }

    const payment = await Payments.findById(paymentId);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.paymentType !== "subscription") {
      return res.status(400).json({
        success: false,
        message: "Only subscription payments can be approved with this action",
        paymentType: payment.paymentType,
      });
    }

    if (payment.status !== REVIEWABLE_STATUS) {
      return res.status(400).json({
        success: false,
        message: `Only payments with status "${REVIEWABLE_STATUS}" can be approved`,
        currentStatus: payment.status,
      });
    }

    const shop = await ShopsData.findOne({ shopId: payment.shopId });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found for this payment" });
    }

    const validation = validateFirstMultiMonthSubscriptionPayment(
      shop,
      payment,
      paymentId,
    );
    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        ...(validation.subscriptionType && {
          subscriptionType: validation.subscriptionType,
        }),
        ...(validation.paymentSubscriptionType && {
          paymentSubscriptionType: validation.paymentSubscriptionType,
        }),
        ...(validation.subscriptionStartDate && {
          subscriptionStartDate: validation.subscriptionStartDate,
        }),
        ...(validation.nextPaymentDate && {
          nextPaymentDate: validation.nextPaymentDate,
        }),
      });
    }

    payment.status = "approve";
    payment.reason = null;
    if (!payment.exactPaymentDay) {
      payment.exactPaymentDay = startOfDay(payment.submittedDate || new Date());
    }

    await applyShopUpdatesOnFirstMultiMonthSubscriptionApprove(shop);
    await payment.save();

    const usersLoggedOut = await clearShopUserTokens(shop.shopId);

    const approvalSmsResult = await sendSubscriptionPaymentApprovedSms(
      shop,
      payment,
      { isRenewal: false },
    );
    if (!approvalSmsResult.sent) {
      console.log(
        "first multi-month subscription approved SMS not sent",
        approvalSmsResult.reason,
      );
    }

    res.status(200).json({
      success: true,
      message: formatSubscriptionActionMessage(
        shop.subscriptionType,
        "approve",
        false,
      ),
      subscriptionType: shop.subscriptionType,
      usersLoggedOut,
      customerSms: approvalSmsResult,
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: formatShopSummary(shop.toObject()),
    });
  } catch (error) {
    if (error.code === "FIRST_MULTI_MONTH_SUBSCRIPTION_APPROVE") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log("error in approveFirstMultiMonthSubscriptionPayment", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const rejectFirstMultiMonthSubscriptionPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    if (!isValidObjectId(paymentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment id" });
    }

    const reasonTrimmed = reason != null ? String(reason).trim() : "";
    if (!reasonTrimmed) {
      return res.status(400).json({
        success: false,
        message: "Reason is required when rejecting a payment",
      });
    }

    const payment = await Payments.findById(paymentId);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.paymentType !== "subscription") {
      return res.status(400).json({
        success: false,
        message: "Only subscription payments can be rejected with this action",
        paymentType: payment.paymentType,
      });
    }

    if (payment.status !== REVIEWABLE_STATUS) {
      return res.status(400).json({
        success: false,
        message: `Only payments with status "${REVIEWABLE_STATUS}" can be rejected`,
        currentStatus: payment.status,
      });
    }

    const shop = await ShopsData.findOne({ shopId: payment.shopId });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found for this payment" });
    }

    const validation = validateFirstMultiMonthSubscriptionPayment(
      shop,
      payment,
      paymentId,
    );
    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
        ...(validation.subscriptionType && {
          subscriptionType: validation.subscriptionType,
        }),
      });
    }

    payment.status = "rejected";
    payment.reason = reasonTrimmed;
    await payment.save();

    const rejectionSmsResult = await sendSubscriptionPaymentRejectedSms(
      shop,
      payment,
      reasonTrimmed,
      { isRenewal: false },
    );
    if (!rejectionSmsResult.sent) {
      console.log(
        "first multi-month subscription rejected SMS not sent",
        rejectionSmsResult.reason,
      );
    }

    res.status(200).json({
      success: true,
      message: formatSubscriptionActionMessage(
        shop.subscriptionType,
        "reject",
        false,
      ),
      customerSms: rejectionSmsResult,
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: formatShopSummary(shop.toObject()),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log("error in rejectFirstMultiMonthSubscriptionPayment", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const rejectSubscriptionPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    if (!isValidObjectId(paymentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment id" });
    }

    const reasonTrimmed = reason != null ? String(reason).trim() : "";
    if (!reasonTrimmed) {
      return res.status(400).json({
        success: false,
        message: "Reason is required when rejecting a payment",
      });
    }

    const payment = await Payments.findById(paymentId);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    if (payment.paymentType !== "subscription") {
      return res.status(400).json({
        success: false,
        message: "Only subscription payments can be rejected with this action",
        paymentType: payment.paymentType,
      });
    }

    if (payment.status !== REVIEWABLE_STATUS) {
      return res.status(400).json({
        success: false,
        message: `Only payments with status "${REVIEWABLE_STATUS}" can be rejected`,
        currentStatus: payment.status,
      });
    }

    const shop = await ShopsData.findOne({ shopId: payment.shopId });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found for this payment" });
    }

    const scenarioCheck = validateSubscriptionRejectScenario(shop, paymentId);
    if (scenarioCheck.error) {
      return res.status(400).json({
        success: false,
        message: scenarioCheck.error,
      });
    }

    payment.status = "rejected";
    payment.reason = reasonTrimmed;
    await payment.save();

    const rejectionSmsResult = await sendSubscriptionPaymentRejectedSms(
      shop,
      payment,
      reasonTrimmed,
      { isRenewal: true },
    );
    if (!rejectionSmsResult.sent) {
      console.log(
        "subscription payment rejected SMS not sent",
        rejectionSmsResult.reason,
      );
    }

    const subscriptionType = resolveSubscriptionTypeForSms(shop, payment);

    res.status(200).json({
      success: true,
      message: formatSubscriptionActionMessage(
        subscriptionType,
        "reject",
        true,
      ),
      customerSms: rejectionSmsResult,
      payment: formatPaymentRecord(payment.toObject(), req),
      shop: formatShopSummary(shop.toObject()),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log("error in rejectSubscriptionPayment", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  /** payments */
  getOnboardingPayments,
  getSubscriptionPayments,
  getPaymentDetails,

  /** Upfront payment */
  approveUpfrontPayment,
  rejectUpfrontPayment,

  /** Subscription payment */
  approveSubscriptionPayment,
  resetAndApproveSubscriptionPayment,
  rejectSubscriptionPayment,


  /** First multi-month subscription payment */
  approveFirstMultiMonthSubscriptionPayment,
  rejectFirstMultiMonthSubscriptionPayment,

  
};
