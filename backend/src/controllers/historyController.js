const mongoose = require("mongoose");
const Cart = require("../models/cart");
const History = require("../models/history");
const SalePerson = require("../models/salePerson");
const User = require("../models/user");
const Product = require("../models/product");
const BranchStock = require("../models/branchStock");
const Branch = require("../models/branch");
const ShopsData = require("../models/shopsData");
const { sendSms } = require("../services/smsService");
const {
  buildDigitalReceiptUrl,
  buildHistoryReceiptSmsMessage,
} = require("../utils/historyReceiptSms");
const {
  manageCustomerData,
  removeCustomerData,
  buildPastOrderSnapshot,
} = require("./customerController");

const PAYMENT_OPTIONS = History.PAYMENT_OPTIONS;

function normalizeShopId(value) {
  return value ? String(value).trim().toUpperCase() : "";
}

function normalizeBranchId(value) {
  return value ? String(value).trim().toUpperCase() : "";
}

function requireShopId(req, res) {
  const shopId = normalizeShopId(req.user?.shopId);
  if (!shopId) {
    res.status(400).json({ success: false, message: "Shop id is required" });
    return null;
  }
  return shopId;
}

function requireShopAndBranchId(req, res) {
  const shopId = requireShopId(req, res);
  if (!shopId) return null;

  const branchId = normalizeBranchId(req.user?.branchId);
  if (!branchId) {
    res.status(400).json({ success: false, message: "Branch id is required" });
    return null;
  }

  return { shopId, branchId };
}

function roundMoney(value) {
  return Number(Math.max(0, value).toFixed(2));
}

function parsePagination(query) {
  const pageRaw = parseInt(String(query?.page ?? "1"), 10);
  const limitRaw = parseInt(String(query?.limit ?? "20"), 10);

  const page = Number.isNaN(pageRaw) ? 1 : Math.max(1, pageRaw);
  const limit = Number.isNaN(limitRaw)
    ? 20
    : Math.min(100, Math.max(1, limitRaw));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function parseDate(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

const ORDER_ID_MIN_LENGTH = 6;
const ORDER_ID_LENGTH = 8;
const ORDER_ID_CHARS = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function buildRandomOrderId(length = ORDER_ID_LENGTH) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += ORDER_ID_CHARS[Math.floor(Math.random() * ORDER_ID_CHARS.length)];
  }
  return value;
}

function buildOrderIdFromCartNumber(cartNumber) {
  const normalized = Math.max(1, Math.floor(Number(cartNumber)));
  return String(normalized).padStart(6, '0');
}

async function generateShopOrderId(shopId, branchId, cartNumber) {
  const normalizedShopId = normalizeShopId(shopId);
  const normalizedBranchId = normalizeBranchId(branchId);
  const preferred = buildOrderIdFromCartNumber(cartNumber);

  const exists = await History.exists({
    shopId: normalizedShopId,
    branchId: normalizedBranchId,
    orderId: preferred,
  });
  if (!exists) {
    return preferred;
  }

  // Fallback for legacy collisions — should be rare after per-branch numbering.
  const MAX_ATTEMPTS = 12;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = buildRandomOrderId(ORDER_ID_LENGTH);
    if (candidate.length < ORDER_ID_MIN_LENGTH) continue;

    const collision = await History.exists({
      shopId: normalizedShopId,
      branchId: normalizedBranchId,
      orderId: candidate,
    });
    if (!collision) {
      return candidate;
    }
  }

  throw new Error('Could not generate a unique order id for this branch');
}

function sanitizeMobile(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .trim();
}

function normalizePaymentOption(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();
  return PAYMENT_OPTIONS.includes(normalized) ? normalized : null;
}

function normalizeReverseStatus(value) {
  if (value === undefined || value === null || value === "") return null;

  const normalized = String(value).trim().toLowerCase();
  if (normalized === "reversed" || normalized === "canceled") return normalized;
  return null;
}

const ALLOWED_SMS_RECEIPT_STATUSES = new Set(["active", "due"]);

function resolveSmsReceiptBlockReason(smsFeature) {
  const status = smsFeature?.smsFeatureStatus ?? "notActivated";

  if (status === "pending") {
    return "SMS feature payment is pending approval";
  }
  if (status === "inactive") {
    return "SMS feature is disabled for this shop";
  }
  if (status === "notActivated") {
    return "SMS feature is not activated for this shop";
  }

  return "SMS feature is not enabled for this shop";
}

function canShopSendReceiptSms(smsFeature) {
  const feature = smsFeature ?? {};
  const isSmsFeatureActive = feature.isSmsFeatureActive === true;
  const smsFeatureStatus = feature.smsFeatureStatus ?? "notActivated";

  if (!ALLOWED_SMS_RECEIPT_STATUSES.has(smsFeatureStatus)) {
    return {
      allowed: false,
      reason: resolveSmsReceiptBlockReason(feature),
    };
  }

  if (smsFeatureStatus === "active" && !isSmsFeatureActive) {
    return {
      allowed: false,
      reason: resolveSmsReceiptBlockReason(feature),
    };
  }

  const senderId = feature.senderId?.trim();
  if (!senderId) {
    return {
      allowed: false,
      reason: "Shop sender ID is not configured",
    };
  }

  return { allowed: true, senderId };
}

async function sendHistoryReceiptSms({
  shopId,
  customerMobile,
  historyRecord,
  amount,
  totalAmount,
  isDiscount,
  discountedAmount,
  orderId,
}) {
  const shop = await ShopsData.findOne({ shopId })
    .select("shopName smsfeature")
    .lean();

  if (!shop) {
    return { sent: false, reason: "Shop not found" };
  }

  const smsGate = canShopSendReceiptSms(shop.smsfeature);
  if (!smsGate.allowed) {
    return { sent: false, reason: smsGate.reason };
  }

  const mobile = sanitizeMobile(customerMobile);
  if (!isValidCustomerMobile(mobile)) {
    return { sent: false, reason: "Valid customer mobile number is required" };
  }

  const receiptUrl = buildDigitalReceiptUrl(historyRecord._id);
  if (!receiptUrl) {
    return {
      sent: false,
      reason: "DIGITAL_RECEIPT_BASE_URL is not configured",
    };
  }

  const message = buildHistoryReceiptSmsMessage({
    shopName: shop.shopName,
    orderId,
    cartNumber: historyRecord.cartNumber,
    amount,
    totalAmount,
    isDiscount,
    discountedAmount,
    receiptUrl,
    items: historyRecord.items ?? [],
  });

  await sendSms({
    to: mobile,
    message,
    senderId: smsGate.senderId,
  });

  return { sent: true, senderId: smsGate.senderId };
}

function isValidCustomerMobile(mobile) {
  return /^0\d{9}$/.test(mobile);
}

function addMonthsToDate(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + Number(months));
  return result;
}

async function buildHistoryItemsFromCart(cartItems, checkOutTime, shopId) {
  const items = Array.isArray(cartItems) ? cartItems : [];
  const productIds = items
    .map((item) => item?.productId)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

  const shop = await ShopsData.findOne({ shopId })
    .select('warrantyModule')
    .lean();
  const warrantyModuleEnabled = Boolean(shop?.warrantyModule);

  let productMap = new Map();
  if (warrantyModuleEnabled && productIds.length) {
    const products = await Product.find({
      shopId,
      _id: { $in: productIds },
    })
      .select('warrantyAvailable warrantyMonths')
      .lean();

    productMap = new Map(products.map((product) => [String(product._id), product]));
  }

  return items.map((item) => {
    const entry = {
      productId: item.productId,
      productName: item.name,
      qty: item.quantity,
      unitCost: item.unitCost ?? null,
    };

    if (!warrantyModuleEnabled) {
      return entry;
    }

    const product = productMap.get(String(item.productId));
    const warrantyMonths = Number(product?.warrantyMonths);
    if (product?.warrantyAvailable && Number.isFinite(warrantyMonths) && warrantyMonths >= 1) {
      entry.warrantyMonths = warrantyMonths;
      entry.warrantyExpiresAt = addMonthsToDate(checkOutTime, warrantyMonths);
    }

    return entry;
  });
}

function mapHistoryItem(item) {
  return {
    productId: item.productId,
    productName: item.productName,
    qty: item.qty,
    unitCost: item.unitCost ?? null,
    warrantyMonths: item.warrantyMonths ?? null,
    warrantyExpiresAt: item.warrantyExpiresAt ?? null,
  };
}

function mapHistoryRecord(record) {
  return {
    _id: record._id,
    shopId: record.shopId,
    branchId: record.branchId,
    cartId: record.cartId,
    cartNumber: record.cartNumber,
    orderId: record.orderId,
    checkOutTime: record.checkOutTime,
    amount: roundMoney(record.amount),
    isDiscount: Boolean(record.isDiscount),
    discountedAmount: roundMoney(record.discountedAmount ?? 0),
    items: (record.items ?? []).map(mapHistoryItem),
    totalAmount: roundMoney(record.totalAmount),
    customerName: record.customerName ?? "",
    customerMobile: record.customerMobile ?? "",
    isSmsSent: Boolean(record.isSmsSent),
    userId: record.userId,
    submittedUserId: record.submittedUserId,
    submittedUserName: record.submittedUserName ?? "",
    paymentOption: record.paymentOption,
    status: record.status ?? "submited",
    isReversed: Boolean(record.isReversed),
    reversedAt: record.reversedAt ?? null,
    reversedUserId: record.reversedUserId ?? null,
    reversedUserName: record.reversedUserName ?? null,
    salesPersonId: record.salesPersonId ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function buildHistoryListFilter(req, shopId, branchId) {
  const filter = {
    shopId,
    branchId,
  };

  const scopeRaw = req.query?.scope;
  const scope =
    scopeRaw === undefined || scopeRaw === null
      ? "mine"
      : String(scopeRaw).trim().toLowerCase();

  if (scope !== "mine" && scope !== "all") {
    return { error: "Scope must be mine or all" };
  }

  if (scope === "mine") {
    filter.submittedUserId = req.user.id;
  }

  const from = parseDate(req.query?.from);
  const to = parseDate(req.query?.to);

  if (from || to) {
    filter.checkOutTime = {};
    if (from) {
      filter.checkOutTime.$gte = startOfDay(from);
    }
    if (to) {
      filter.checkOutTime.$lte = endOfDay(to);
    }
  }

  const paymentOption = normalizePaymentOption(req.query?.paymentOption);
  if (
    req.query?.paymentOption !== undefined &&
    req.query?.paymentOption !== null &&
    req.query?.paymentOption !== ""
  ) {
    if (!paymentOption) {
      return {
        error: `Payment option must be one of: ${PAYMENT_OPTIONS.join(", ")}`,
      };
    }
    filter.paymentOption = paymentOption;
  }

  const orderIdRaw = req.query?.orderId;
  if (
    orderIdRaw !== undefined &&
    orderIdRaw !== null &&
    String(orderIdRaw).trim() !== ""
  ) {
    const orderIdText = String(orderIdRaw).trim().toUpperCase();
    if (orderIdText.length < ORDER_ID_MIN_LENGTH) {
      return {
        error: `Order id filter must be at least ${ORDER_ID_MIN_LENGTH} characters`,
      };
    }
    filter.orderId = orderIdText;
  }

  const cartNumberRaw = req.query?.cartNumber;
  if (
    cartNumberRaw !== undefined &&
    cartNumberRaw !== null &&
    String(cartNumberRaw).trim() !== ""
  ) {
    const cartNumberText = String(cartNumberRaw).trim();
    const cartNumber = Number.parseInt(cartNumberText, 10);

    if (
      Number.isInteger(cartNumber) &&
      cartNumber > 0 &&
      String(cartNumber) === cartNumberText
    ) {
      filter.cartNumber = cartNumber;
    } else {
      return { error: "Cart number filter must be a positive whole number" };
    }
  }

  const mobileRaw = req.query?.mobile ?? req.query?.customerMobile;
  if (
    mobileRaw !== undefined &&
    mobileRaw !== null &&
    String(mobileRaw).trim() !== ""
  ) {
    const mobile = sanitizeMobile(mobileRaw);
    if (!mobile) {
      return { error: "Mobile number filter must contain digits" };
    }
    filter.customerMobile = { $regex: mobile, $options: "i" };
  }

  return { filter, scope };
}

async function resolveOptionalSalesPersonId(salesPersonIdRaw, shopId, branchId) {
  if (
    salesPersonIdRaw === undefined ||
    salesPersonIdRaw === null ||
    String(salesPersonIdRaw).trim() === ""
  ) {
    return { salesPersonId: null };
  }

  const salesPersonId = String(salesPersonIdRaw).trim();
  if (!mongoose.Types.ObjectId.isValid(salesPersonId)) {
    return { error: "Invalid sales person id" };
  }

  const salePerson = await SalePerson.findOne({
    _id: salesPersonId,
    shopId,
    allowedBranchIds: normalizeBranchId(branchId),
  }).lean();
  if (!salePerson) {
    return { error: "Sales person not found for this shop and branch" };
  }

  return { salesPersonId: salePerson._id };
}

const createHistory = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const {
      sessionId,
      customerName,
      customerMobile,
      paymentOption: paymentOptionRaw,
      salesPersonId: salesPersonIdRaw,
    } = req.body;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid session id is required" });
    }

    const mobile = sanitizeMobile(customerMobile);
    if (mobile && !isValidCustomerMobile(mobile)) {
      return res.status(400).json({
        success: false,
        message: "Customer phone must be 10 digits when provided",
      });
    }

    const paymentOption = normalizePaymentOption(paymentOptionRaw ?? "cash");
    if (!paymentOption) {
      return res.status(400).json({
        success: false,
        message: `Payment option must be one of: ${PAYMENT_OPTIONS.join(", ")}`,
      });
    }

    const cart = await Cart.findOne({
      shopId,
      branchId,
      user: req.user.id,
      sessionId,
      status: "proceed",
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message:
          "Proceed cart session not found. Complete cart checkout first.",
      });
    }

    if (!Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart has no items for history",
      });
    }

    const existingHistory = await History.findOne({
      shopId,
      branchId,
      cartId: cart.sessionId,
    }).lean();
    if (existingHistory) {
      return res.status(409).json({
        success: false,
        message: "History record already exists for this cart",
        data: mapHistoryRecord(existingHistory),
      });
    }

    const submittedUser = await User.findById(req.user.id)
      .select("name")
      .lean();
    const submittedUserName = submittedUser?.name?.trim() || "User";

    const salesPersonResult = await resolveOptionalSalesPersonId(
      salesPersonIdRaw,
      shopId,
      branchId,
    );
    if (salesPersonResult.error) {
      return res.status(400).json({ success: false, message: salesPersonResult.error });
    }

    const amount = roundMoney(cart.totalPrice);
    const discountedAmount = roundMoney(cart.discountedAmount ?? 0);
    const totalAmount = roundMoney(amount - discountedAmount);
    const checkOutTime = new Date();
    const orderId = await generateShopOrderId(shopId, branchId, cart.cartNumber);
    const historyItems = await buildHistoryItemsFromCart(cart.items, checkOutTime, shopId);

    const history = await History.create({
      shopId,
      branchId: cart.branchId || branchId,
      cartId: cart.sessionId,
      cartNumber: cart.cartNumber,
      orderId,
      checkOutTime,
      amount,
      isDiscount: Boolean(cart.isDiscount),
      discountedAmount,
      items: historyItems,
      totalAmount,
      customerName: String(customerName ?? "").trim(),
      customerMobile: mobile,
      userId: cart.user,
      submittedUserId: req.user.id,
      submittedUserName,
      paymentOption,
      salesPersonId: salesPersonResult.salesPersonId,
    });

    try {
      if (mobile) {
        const pastOrderResult = buildPastOrderSnapshot(history);
        if (pastOrderResult.error) {
          console.log("error in createHistory buildPastOrderSnapshot", pastOrderResult.error);
        } else {
          const customerResult = await manageCustomerData({
            shopId,
            mobileNumber: mobile,
            name: customerName,
            salesAmount: totalAmount,
            pastOrder: pastOrderResult.pastOrder,
          });
          if (customerResult?.error) {
            console.log("error in createHistory manageCustomerData", customerResult.error);
          }
        }
      }
    } catch (customerError) {
      console.log("error in createHistory manageCustomerData", customerError.message);
    }

    let smsStatus = { sent: false, reason: "Not attempted" };
    try {
      if (mobile) {
        smsStatus = await sendHistoryReceiptSms({
          shopId,
          customerMobile: mobile,
          historyRecord: history,
          amount,
          totalAmount,
          isDiscount: Boolean(cart.isDiscount),
          discountedAmount,
          orderId,
        });

        if (smsStatus.sent) {
          await History.updateOne({ _id: history._id }, { $set: { isSmsSent: true } });
          history.isSmsSent = true;

          try {
            await ShopsData.recordShopSmsUsage(shopId);
          } catch (usageError) {
            console.log("error in createHistory SMS usage update", usageError.message);
          }
        }
      } else {
        smsStatus = { sent: false, reason: "No customer phone provided" };
      }
    } catch (smsError) {
      console.log("error in createHistory receipt SMS", smsError.message);
      smsStatus = {
        sent: false,
        reason: smsError.message || "SMS send failed",
      };
    }

    res.status(201).json({
      success: true,
      sessionId,
      data: mapHistoryRecord(history),
      message: "History record created",
      sms: smsStatus,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "History record already exists for this cart",
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

const getHistory = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const listQuery = buildHistoryListFilter(req, shopId, branchId);
    if (listQuery.error) {
      return res.status(400).json({ success: false, message: listQuery.error });
    }

    const { filter, scope } = listQuery;
    const { page, limit, skip } = parsePagination(req.query);

    const [total, records] = await Promise.all([
      History.countDocuments(filter),
      History.find(filter)
        .sort({ checkOutTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      scope,
      shopId,
      branchId,
      data: records.map(mapHistoryRecord),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      message: "History loaded",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function getTodayCheckoutRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function getStatsDateRange(query) {
  const start = parseDate(query?.from);
  const end = parseDate(query?.to);

  if (start && end && end > start) {
    return { start, end };
  }

  return getTodayCheckoutRange();
}

function mapSalesStats(rows) {
  const row = rows[0];

  return {
    totalSales: roundMoney(row?.totalSales ?? 0),
    orderCount: row?.orderCount ?? 0,
  };
}

/**
 * Today (or from/to) total sales + order count for the logged-in user's
 * current branch only, and only orders submitted by that user.
 */
const totalSalesBranch_loggedUser_Dashboard = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { start, end } = getStatsDateRange(req.query);
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const rows = await History.aggregate([
      {
        $match: {
          shopId,
          branchId,
          submittedUserId: userId,
          checkOutTime: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const stats = mapSalesStats(rows);

    return res.status(200).json({
      success: true,
      shopId,
      branchId,
      data: {
        totalSales: stats.totalSales,
        orderCount: stats.orderCount,
      },
      message: "Branch logged-user dashboard sales loaded",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Owner only: shop-wide sales across all branches + per-branch breakdown.
 */
const getAllSalesSummary_forDashboard = async (req, res) => {
  try {
    const shopId = requireShopId(req, res);
    if (!shopId) return;

    const user = await User.findById(req.user.id).select("role shopId").lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, user not found",
      });
    }
    if (user.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only owner can view all-branches sales summary",
      });
    }

    const { start, end } = getStatsDateRange(req.query);
    const dateFilter = {
      shopId,
      checkOutTime: { $gte: start, $lt: end },
    };

    const [overallRows, perBranchRows] = await Promise.all([
      History.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      History.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$branchId",
            totalSales: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const overall = mapSalesStats(overallRows);

    const branches = await Branch.find({ shopId })
      .select("branchId branchName isMainBranch isActive")
      .lean();

    const salesByBranchId = new Map(
      perBranchRows.map((row) => [
        String(row._id ?? "").trim().toUpperCase(),
        {
          totalSales: roundMoney(row.totalSales ?? 0),
          orderCount: row.orderCount ?? 0,
        },
      ]),
    );

    const branchesSummary = branches.map((branch) => {
      const id = String(branch.branchId).trim().toUpperCase();
      const sales = salesByBranchId.get(id) ?? { totalSales: 0, orderCount: 0 };
      return {
        branchId: id,
        branchName: branch.branchName,
        isMainBranch: Boolean(branch.isMainBranch),
        isActive: Boolean(branch.isActive),
        totalSales: sales.totalSales,
        orderCount: sales.orderCount,
      };
    });

    // Include any branchIds that have sales but no Branch document (edge case).
    for (const [branchId, sales] of salesByBranchId.entries()) {
      if (!branchId) continue;
      if (branchesSummary.some((b) => b.branchId === branchId)) continue;
      branchesSummary.push({
        branchId,
        branchName: null,
        isMainBranch: false,
        isActive: false,
        totalSales: sales.totalSales,
        orderCount: sales.orderCount,
      });
    }

    return res.status(200).json({
      success: true,
      shopId,
      data: {
        totalSales: overall.totalSales,
        orderCount: overall.orderCount,
        branches: branchesSummary,
      },
      message: "All-branches sales summary loaded",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const reversedSalesData = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const historyId = req.params?.id ?? req.body?.id ?? req.body?.historyId;
    if (!historyId || !mongoose.Types.ObjectId.isValid(String(historyId))) {
      return res.status(400).json({
        success: false,
        message: "Valid history id is required",
      });
    }

    const requestedStatus = normalizeReverseStatus(req.body?.status);
    if (!requestedStatus) {
      return res.status(400).json({
        success: false,
        message: "Status must be canceled or reversed",
      });
    }

    const reversedUser = await User.findById(req.user.id).select("name").lean();
    const reversedUserName = reversedUser?.name?.trim() || "User";
    const reversedAt = new Date();

    let updatedHistory = null;
    await session.withTransaction(async () => {
      const history = await History.findOne({
        _id: historyId,
        shopId,
        branchId,
      }).session(session);

      if (!history) {
        throw new Error("HISTORY_NOT_FOUND");
      }

      if (
        history.isReversed ||
        history.status === "reversed" ||
        history.status === "canceled"
      ) {
        throw new Error("HISTORY_ALREADY_REVERSED");
      }

      const historyBranchId = normalizeBranchId(history.branchId) || branchId;
      const itemEntries = Array.isArray(history.items) ? history.items : [];
      for (const item of itemEntries) {
        if (!item?.productId) continue;

        const product = await Product.findOne({
          _id: item.productId,
          shopId,
        }).session(session);
        if (!product) continue;

        if (!product.isInventoryAvailable) continue;

        const restoreQty = Number(item.qty) || 0;
        if (restoreQty <= 0) continue;

        await BranchStock.findOneAndUpdate(
          {
            shopId,
            branchId: historyBranchId,
            productId: item.productId,
          },
          {
            $inc: { qty: restoreQty },
            $setOnInsert: {
              shopId,
              branchId: historyBranchId,
              productId: item.productId,
            },
          },
          { upsert: true, session, returnDocument: "after" },
        );
      }

      await removeCustomerData(
        {
          shopId,
          mobileNumber: history.customerMobile,
          salesAmount: history.totalAmount,
          historyId: history._id,
        },
        { session },
      );

      history.status = requestedStatus;
      history.isReversed = true;
      history.reversedAt = reversedAt;
      history.reversedUserId = req.user.id;
      history.reversedUserName = reversedUserName;
      await history.save({ session });

      updatedHistory = history.toObject();
    });

    if (!updatedHistory) {
      return res.status(500).json({
        success: false,
        message: "Could not reverse sales data",
      });
    }

    return res.status(200).json({
      success: true,
      data: mapHistoryRecord(updatedHistory),
      message: "Sales data reversed successfully",
    });
  } catch (error) {
    if (error?.message === "HISTORY_NOT_FOUND") {
      return res
        .status(404)
        .json({ success: false, message: "History record not found" });
    }
    if (error?.message === "HISTORY_ALREADY_REVERSED") {
      return res
        .status(409)
        .json({ success: false, message: "History record already reversed" });
    }
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    await session.endSession();
  }
};

const resendBillSms = async (req, res) => {
  try {
    const context = requireShopAndBranchId(req, res);
    if (!context) return;
    const { shopId, branchId } = context;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid history id' });
    }

    const mobile = sanitizeMobile(req.body?.customerMobile);
    if (!mobile) {
      return res.status(400).json({
        success: false,
        message: 'Customer phone number is required',
      });
    }
    if (!isValidCustomerMobile(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'Customer phone number must be 10 digits and start with 0',
      });
    }

    const history = await History.findOne({ _id: id, shopId, branchId });
    if (!history) {
      return res.status(404).json({ success: false, message: 'History record not found' });
    }

    const smsResult = await sendHistoryReceiptSms({
      shopId,
      customerMobile: mobile,
      historyRecord: history,
      amount: history.amount,
      totalAmount: history.totalAmount,
      isDiscount: history.isDiscount,
      discountedAmount: history.discountedAmount,
      orderId: history.orderId,
    });

    if (!smsResult.sent) {
      return res.status(400).json({
        success: false,
        message: smsResult.reason || 'Could not send bill SMS',
      });
    }

    await History.updateOne({ _id: history._id }, { $set: { isSmsSent: true } });
    history.isSmsSent = true;

    try {
      await ShopsData.recordShopSmsUsage(shopId);
    } catch (usageError) {
      console.log('error in resendBillSms SMS usage update', usageError.message);
    }

    const previousMobile = sanitizeMobile(history.customerMobile);
    if (mobile !== previousMobile) {
      history.customerMobile = mobile;
      await history.save();
    }

    return res.status(200).json({
      success: true,
      data: mapHistoryRecord(history),
      message: 'Bill SMS sent successfully',
    });
  } catch (error) {
    if (error.code === 'SMS_API_ERROR') {
      return res.status(error.httpStatus || 500).json({
        success: false,
        message: error.message || 'Failed to send bill SMS',
        code: 'SMS_SEND_FAILED',
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createHistory,
  getHistory,
  totalSalesBranch_loggedUser_Dashboard,
  getAllSalesSummary_forDashboard,
  reversedSalesData,
  resendBillSms,
};
