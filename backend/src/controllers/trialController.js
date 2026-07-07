const Payments = require("../models/payments");
const ShopsData = require("../models/shopsData");
const User = require("../models/user");
const {
  generateUpFrontReceiptNumber,
  formatPaymentRecord,
  UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
} = require("../utils/paymentReceiptHelper");
const {
  createAndSaveTrialToken,
  clearUserToken,
} = require("../utils/tokenHelper");
const {
  TRIAL_DURATION_DAYS,
  addDays,
  getTrialSecondsRemaining,
  getTokenExpiresInSeconds,
  isActiveTrial,
  isTrialEnded,
  finishTrialManually,
} = require("../utils/trialHelper");
const { sendSms } = require("../services/smsService");

function formatTrialEndDateTime(date) {
  return new Date(date).toLocaleString("en-LK", {
    timeZone: "Asia/Colombo",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function buildTrialStartedSmsMessage(trialEndDate) {
  const endLabel = formatTrialEndDateTime(trialEndDate);
  return `Welcome to Smart Cost - All in one Business solution. You have successfully activated ${TRIAL_DURATION_DAYS} days trial. Your trial will end on ${endLabel}.`;
}

async function sendTrialStartedSms(shop) {
  const mobile = shop.ownerMobileNumber?.trim();
  if (!mobile) {
    return { sent: false, reason: "Owner mobile number is not set" };
  }

  if (!shop.trailEndDate) {
    return { sent: false, reason: "Trial end date is not set" };
  }

  try {
    await sendSms({
      to: mobile,
      message: buildTrialStartedSmsMessage(shop.trailEndDate),
    });
    return { sent: true };
  } catch (error) {
    console.log("error in sendTrialStartedSms", error.message);
    return { sent: false, reason: error.message || "SMS send failed" };
  }
}

function buildTrialResponse(
  shop,
  {
    message,
    token,
    tokenExpiresInSeconds,
    alreadyActive = false,
    upFrontPayment = null,
    subscriptionPayment = null,
  },
) {
  return {
    success: true,
    message,
    alreadyActive,
    shopId: shop.shopId,
    status: shop.status,
    isTrailStared: shop.isTrailStared,
    isTrailCompleted: shop.isTrailCompleted,
    isOneTimePaymentGenerated: shop.isOneTimePaymentGenerated,
    trailStartDate: shop.trailStartDate,
    trailEndDate: shop.trailEndDate,
    trialDays: TRIAL_DURATION_DAYS,
    trialSecondsRemaining: getTrialSecondsRemaining(shop),
    tokenExpiresInSeconds,
    token: token ?? null,
    upFrontPayment,
    subscriptionPayment,
  };
}

async function findExistingUpFrontInvoice(shopId) {
  return Payments.findOne({
    shopId,
    paymentType: "upFront",
  })
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Creates a notPaid up-front invoice when trial starts (first time only).
 * User uploads receipt later to move status to pending.
 */
async function createUpFrontInvoiceIfNeeded(shop) {
  if (shop.isOneTimePaymentGenerated) {
    const existing = await findExistingUpFrontInvoice(shop.shopId);
    return { created: false, payment: existing };
  }

  const existingNotPaid = await Payments.findOne({
    shopId: shop.shopId,
    paymentType: "upFront",
    status: "notPaid",
  }).lean();

  if (existingNotPaid) {
    shop.isOneTimePaymentGenerated = true;
    shop.oneTimePaymentReceiptNo = getPaymentDocumentId(existingNotPaid);
    await shop.save();
    return { created: false, payment: existingNotPaid };
  }

  if (shop.oneTimePaymentAmount == null || shop.oneTimePaymentAmount <= 0) {
    const error = new Error(
      "One-time payment amount is not configured for this shop. Please contact support.",
    );
    error.code = "ONE_TIME_AMOUNT_NOT_SET";
    throw error;
  }

  const receiptNumber = await generateUpFrontReceiptNumber();

  const payment = await Payments.create({
    shopId: shop.shopId,
    receiptNumber,
    receiptImagePath: UPFRONT_INVOICE_IMAGE_PLACEHOLDER,
    paymentMonth: null,
    paymentAmount: shop.oneTimePaymentAmount,
    paymentType: "upFront",
    exactPaymentDay: null,
    expiryDate: null,
    status: "notPaid",
    reason: null,
    IsOnboaringPayment:true,
    description: "this is one time payment for initial setup",
  });

  shop.isOneTimePaymentGenerated = true;
  shop.oneTimePaymentReceiptNo = getPaymentDocumentId(payment);
  await shop.save();

  return { created: true, payment: payment.toObject() };
}

function parseStartTrialBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return null;
}

function getPaymentDocumentId(payment) {
  if (!payment?._id) {
    return null;
  }
  return String(payment._id);
}

async function createTrialPayments(shop) {
  const upFrontResult = await createUpFrontInvoiceIfNeeded(shop);

  return {
    upFrontPayment: upFrontResult.payment
      ? formatPaymentRecord(upFrontResult.payment)
      : null,
  };
}

// start trial
const startTrail = async (req, res) => {
  try {
    const { startTrial, shopId: bodyShopId } = req.body;
    // parse start trial boolean
    const startTrialParsed = parseStartTrialBoolean(startTrial);
    // check if start trial is a boolean
    if (startTrialParsed === null) {
      return res
        .status(400)
        .json({ success: false, message: "startTrial must be a boolean" });
    }
    // check if start trial is true
    if (!startTrialParsed) {
      return res.status(400).json({
        success: false,
        message: "startTrial must be true to begin the trial",
      });
    }
    // check if user exists
    const user = await User.findById(req.user.id).select("shopId role").lean();
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }
    // check if shop id is provided
    const shopId = (bodyShopId || user.shopId || "").trim().toUpperCase();
    if (!shopId) {
      return res
        .status(400)
        .json({ success: false, message: "Shop id is required" });
    }
    // check if shop id is the same as the user's shop id
    if (user.shopId && shopId !== user.shopId.trim().toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: "You can only start a trial for your own shop",
      });
    }
    // check if shop exists
    const shop = await ShopsData.findOne({ shopId });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // Trial expiration is handled by trial cron — only read current shop state here
    if (isTrialEnded(shop)) {
      return res.status(400).json({
        success: false,
        message:
          "Trial has already ended for this shop. Please subscribe to continue.",
        shopId: shop.shopId,
        status: shop.status,
        isTrailCompleted: shop.isTrailCompleted,
        trailEndDate: shop.trailEndDate,
        trialExpired: true,
      });
    }

    if (shop.status === "active") {
      return res.status(400).json({
        success: false,
        message: "This shop already has an active subscription.",
        shopId: shop.shopId,
        status: shop.status,
      });
    }
    // check if trial is already active
    const alreadyActive = isActiveTrial(shop);
    let upFrontInvoice = null;

    if (!alreadyActive) {
      const trailStartDate = new Date();
      const trailEndDate = addDays(trailStartDate, TRIAL_DURATION_DAYS);

      shop.isTrailStared = true;
      shop.isTrailCompleted = false;
      shop.trailStartDate = trailStartDate;
      shop.trailEndDate = trailEndDate;
      shop.status = "trial";
      // create trial payments
      const payments = await createTrialPayments(shop);
      upFrontInvoice = payments.upFrontPayment;

      await shop.save();

      const trialSmsResult = await sendTrialStartedSms(shop);
      if (!trialSmsResult.sent) {
        console.log("trial started SMS not sent", trialSmsResult.reason);
      }
    } else if (!shop.isOneTimePaymentGenerated) {
      const payments = await createTrialPayments(shop);
      upFrontInvoice = payments.upFrontPayment;
    } else {
      const existing = await findExistingUpFrontInvoice(shop.shopId);
      upFrontInvoice = existing ? formatPaymentRecord(existing) : null;

      if (existing && !shop.oneTimePaymentReceiptNo) {
        shop.oneTimePaymentReceiptNo = getPaymentDocumentId(existing);
        await shop.save();
      }
    }

    const { token, tokenExpiresInSeconds } = await createAndSaveTrialToken(
      req.user.id,
      shop,
    );

    await User.findByIdAndUpdate(req.user.id, { isFirsttimeLogin: false });

    const hasUnpaidUpFront = upFrontInvoice?.status === "notPaid";

    let trialMessage = "Trial started successfully";
    if (alreadyActive) {
      trialMessage = "Trial is already active";
    } else if (hasUnpaidUpFront) {
      trialMessage =
        "Trial started. Please pay the one-time fee and upload your receipt.";
    }

    res.status(200).json(
      buildTrialResponse(shop, {
        message: trialMessage,
        token,
        tokenExpiresInSeconds,
        alreadyActive,
        upFrontPayment: upFrontInvoice,
      }),
    );
  } catch (error) {
    if (error.code === "ONE_TIME_AMOUNT_NOT_SET") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log("error in startTrail", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// skip trial
const skipTrail = async (req, res) => {
  try {
    const { shopId: bodyShopId } = req.body;

    const user = await User.findById(req.user.id).select("shopId role").lean();
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    const shopId = (bodyShopId || user.shopId || "").trim().toUpperCase();
    if (!shopId) {
      return res
        .status(400)
        .json({ success: false, message: "Shop id is required" });
    }

    if (user.shopId && shopId !== user.shopId.trim().toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: "You can only skip trial for your own shop",
      });
    }

    const shop = await ShopsData.findOne({ shopId });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    if (shop.status === "active") {
      return res.status(400).json({
        success: false,
        message: "This shop already has an active subscription.",
        shopId: shop.shopId,
        status: shop.status,
      });
    }

    const now = new Date();
    let upFrontInvoice = null;
    const alreadySkipped =
      shop.status === "trialExpired" && shop.isTrailCompleted === true;

    if (!alreadySkipped) {
      shop.isTrailStared = true;
      shop.isTrailCompleted = true;
      shop.trailStartDate = now;
      shop.trailEndDate = now;
      shop.status = "trialExpired";

      const payments = await createTrialPayments(shop);
      upFrontInvoice = payments.upFrontPayment;

      await shop.save();
    } else {
      const payments = await createTrialPayments(shop);
      upFrontInvoice = payments.upFrontPayment;
    }

    await clearUserToken(req.user.id);
    await User.findByIdAndUpdate(req.user.id, { isFirsttimeLogin: false });

    const hasUnpaidUpFront = upFrontInvoice?.status === "notPaid";
    const skipMessage = hasUnpaidUpFront
      ? "Trial skipped. Please pay the one-time upfront fee to activate your subscription."
      : "Trial skipped successfully";

    res.status(200).json({
      success: true,
      message: skipMessage,
      shopId: shop.shopId,
      status: shop.status,
      isTrailStared: shop.isTrailStared,
      isTrailCompleted: shop.isTrailCompleted,
      isOneTimePaymentGenerated: shop.isOneTimePaymentGenerated,
      trailStartDate: shop.trailStartDate,
      trailEndDate: shop.trailEndDate,
      trialExpired: true,
      sessionEnded: true,
      upFrontPayment: upFrontInvoice,
    });
  } catch (error) {
    if (error.code === "ONE_TIME_AMOUNT_NOT_SET") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.log("error in skipTrail", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// finish trial
const finishTrail = async (req, res) => {
  try {
    // check if shop id is provided
    const { shopId: bodyShopId } = req.body;
    // check if user exists
    const user = await User.findById(req.user.id).select("shopId role").lean();
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }
    // check if shop id is provided
    const shopId = (bodyShopId || user.shopId || "").trim().toUpperCase();
    if (!shopId) {
      return res
        .status(400)
        .json({ success: false, message: "Shop id is required" });
    }
    // check if shop id is the same as the user's shop id
    if (user.shopId && shopId !== user.shopId.trim().toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: "You can only finish trial for your own shop",
      });
    }
    // check if shop exists
    let shop = await ShopsData.findOne({ shopId });
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }
    // check if trial is already finished
    if (shop.status === "trialExpired" && shop.isTrailCompleted) {
      await clearUserToken(req.user.id);
      return res.status(200).json({
        success: true,
        message: "Trial is already finished",
        shopId: shop.shopId,
        status: shop.status,
        isTrailStared: shop.isTrailStared,
        isTrailCompleted: shop.isTrailCompleted,
        trailStartDate: shop.trailStartDate,
        trailEndDate: shop.trailEndDate,
        trialExpired: true,
        sessionEnded: true,
      });
    }

    if (!shop.isTrailStared || shop.status !== "trial") {
      return res.status(400).json({
        success: false,
        message:
          "No active trial to finish. Start a trial first or use skip trial.",
        shopId: shop.shopId,
        status: shop.status,
        isTrailStared: shop.isTrailStared,
      });
    }

    shop = await finishTrialManually(shop);
    await clearUserToken(req.user.id);

    res.status(200).json({
      success: true,
      message: "Trial finished successfully",
      shopId: shop.shopId,
      status: shop.status,
      isTrailStared: shop.isTrailStared,
      isTrailCompleted: shop.isTrailCompleted,
      trailStartDate: shop.trailStartDate,
      trailEndDate: shop.trailEndDate,
      trialExpired: true,
      sessionEnded: true,
    });
  } catch (error) {
    console.log("error in finishTrail", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { startTrail, skipTrail, finishTrail };
