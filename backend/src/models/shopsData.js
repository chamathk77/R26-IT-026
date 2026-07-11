const mongoose = require("mongoose");

const SHOP_STATUS = [
  "disabled",
  "trial",
  "trialExpired",
  "initialPaymentApproved",
  "subscriptionPaymentPending",
  "active",
  "due",
  "paymentPending",
  "diactiveByAdmin",
];

const SUBSCRIPTION_TYPES = ["1month", "3months", "6months", "1year"];

const SUBSCRIPTION_FEES = [
  { type: "1month", fee: 3900 },
  { type: "3months", fee: 10800 },
  { type: "6months", fee: 21000 },
  { type: "1year", fee: 40800 },
];

const SMS_PACKAGES = [
  {
    type: "0-500",
    minMessageCount: 0,
    maxMessageCount: 500,
    messageCount: 500,
    fee: 575,
  },
  {
    type: "500-1000",
    minMessageCount: 500,
    maxMessageCount: 1000,
    messageCount: 1000,
    fee: 1150,
  },
  {
    type: "1000-1500",
    minMessageCount: 1000,
    maxMessageCount: 1500,
    messageCount: 1500,
    fee: 1725,
  },
  {
    type: "1500-2000",
    minMessageCount: 1500,
    maxMessageCount: 2000,
    messageCount: 2000,
    fee: 2300,
  },
  {
    type: "2000-2500",
    minMessageCount: 2000,
    maxMessageCount: 2500,
    messageCount: 2500,
    fee: 2875,
  },
  {
    type: "2500-3000",
    minMessageCount: 2500,
    maxMessageCount: 3000,
    messageCount: 3000,
    fee: 3450,
  },
  {
    type: "3000-3500",
    minMessageCount: 3000,
    maxMessageCount: 3500,
    messageCount: 3500,
    fee: 4025,
  },
  {
    type: "3500-4000",
    minMessageCount: 3500,
    maxMessageCount: 4000,
    messageCount: 4000,
    fee: 4600,
  },
  {
    type: "4000-4500",
    minMessageCount: 4000,
    maxMessageCount: 4500,
    messageCount: 4500,
    fee: 5175,
  },
];

const SMS_PACKAGE_TYPES = SMS_PACKAGES.map((pkg) => pkg.type);

function findSmsPackageByUsage(usedCount) {
  const count = Math.max(0, Number(usedCount) || 0);
  const matched = SMS_PACKAGES.find((pkg) => count <= pkg.maxMessageCount);
  return matched ?? SMS_PACKAGES[SMS_PACKAGES.length - 1];
}

function buildSmsUsageIncrementUpdate(currentUsedCount) {
  const nextUsedCount = Math.max(0, Number(currentUsedCount) || 0) + 1;
  const matchedPackage = findSmsPackageByUsage(nextUsedCount);

  return {
    smsUsedInPeriod: nextUsedCount,
    smsPackageType: matchedPackage.type,
  };
}

/** Per additional user monthly fee (LKR). Change here to update billing everywhere. */
const ADDITIONAL_USER_FEE_LKR = 390;

/** Web portal add-on monthly fee (LKR). Billing integration — future release. */
const WEB_MODULE_FEE_LKR = 2990;

const SUBSCRIPTION_DURATION_DAYS = {
  "1month": 30,
  "3months": 90,
  "6months": 180,
  "1year": 364,
};

function getSubscriptionFee(subscriptionType) {
  const entry = SUBSCRIPTION_FEES.find(
    (item) => item.type === subscriptionType,
  );
  return entry?.fee ?? null;
}

function getSubscriptionSaveAmount(subscriptionType, fee) {
  const oneMonthFee = getSubscriptionFee("1month");
  const includedDays = SUBSCRIPTION_DURATION_DAYS[subscriptionType];
  const oneMonthDays = SUBSCRIPTION_DURATION_DAYS["1month"];

  if (
    !oneMonthFee ||
    !includedDays ||
    !oneMonthDays ||
    subscriptionType === "1month"
  ) {
    return 0;
  }

  const equivalentMonthlyTotal = oneMonthFee * (includedDays / oneMonthDays);
  return Math.max(0, Math.round(equivalentMonthlyTotal - fee));
}

function buildSubscriptionPlansList() {
  return SUBSCRIPTION_FEES.map(({ type, fee }) => ({
    type,
    fee,
    includedDays: SUBSCRIPTION_DURATION_DAYS[type],
    saveAmount: getSubscriptionSaveAmount(type, fee),
  }));
}

const ONBOARD_STEPS = [
  "startOnboarding",
  "shopRegistered",
  "otpVerified",
  "passwordSet",
  "completed",
];

const shopsDataSchema = new mongoose.Schema(
  {
    //shop related
    shopId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    shopName: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    shopMobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    ownerFirstName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerLastName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerMobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    isVerifyEmail: {
      type: Boolean,
      default: false,
    },
    isVerifyPhoneNumber: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: Number,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    onboardStep: {
      type: String,
      enum: ONBOARD_STEPS,
      default: "startOnboarding",
    },
    smsfeature: {

      senderId: {
        type: String,
        default: null,
        trim: true,
      },
      
      smsPackageType: {
        type: String,
        enum: SMS_PACKAGE_TYPES,
        default: null,
      },

      smsUsedInPeriod: {
        type: Number,
        default: 0,
        min: 0,
      },

      isSmsFeatureActive: {
        type: Boolean,
        default: false,
      },

      smsFeatureStatus: {
        type: String,
        enum: [ 'notActivated', "active", "pending", "due", "inactive"],
        default: "notActivated",
      },

      smsNextRenewalDate: {
        type: Date,
        default: null,
      },

      smsDueDays: {
        type: Number,
        default: 0,
        min: 0,
      },

      smsReceiptNo: {
        type: String,
        default: null,
        trim: true,
      },

    },

    //module related
    kpi: {
      type: Boolean,
      default: false,
    },
    analyticsModule: {
      type: Boolean,
      default: false,
    },
    customerManualOrder: {
      type: Boolean,
      default: false,
    },
    costModule: {
      type: Boolean,
      default: false,
    },
    marketingModule: {
      type: Boolean,
      default: false,
    },
    maxUsers: {
      type: Number,
      default: 3,
      min: 1,
    },
    isAdditionalUsersAdded: {
      type: Boolean,
      default: false,
    },
    numAdditionalUsers: {
      type: Number,
      default: null,
      min: 0,
    },
    /** Future release: shop web portal access (same API as mobile). */
    webModule: {
      type: Boolean,
      default: false,
    },
    webModuleEnabledAt: {
      type: Date,
      default: null,
    },

    //subscription related

    status: {
      type: String,
      enum: SHOP_STATUS,
      default: "disabled", // disabled, trial, active, due,trialExpired
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    currentPaymentDoneDate: {
      type: Date,
      default: null,
    },
    nextPaymentDate: {
      type: Date,
      default: null,
    },

    subsAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    subscriptionType: {
      type: String,
      enum: SUBSCRIPTION_TYPES,
      default: null,
    },
    subscriptionReceiptNo: {
      type: String,
      default: null,
      trim: true,
    },
    oneTimePaymentAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    isOneTimePaymentDone: {
      type: Boolean,
      default: false,
    },
    isOneTimePaymentGenerated: {
      type: Boolean,
      default: false,
    },
    oneTimePaymentReceiptNo: {
      type: String,
      default: null,
      trim: true,
    },

    trailStartDate: {
      type: Date,
      default: null,
    },

    trailEndDate: {
      type: Date,
      default: null,
    },
    isTrailStared: {
      type: Boolean,
      default: false,
    },
    isTrailCompleted: {
      type: Boolean,
      default: false,
    },

    subscriptionDueDays: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

async function generateNextShopId() {
  const ShopsData = mongoose.model("ShopsData");
  const lastShop = await ShopsData.findOne(
    { shopId: /^SI\d{6}$/i },
    { shopId: 1 },
  )
    .sort({ shopId: -1 })
    .lean();

  if (!lastShop?.shopId) {
    return "SI000001";
  }

  const match = String(lastShop.shopId).match(/^SI(\d{6})$/i);
  const nextNumber = match ? Number.parseInt(match[1], 10) + 1 : 1;
  return `SI${String(nextNumber).padStart(6, "0")}`;
}

shopsDataSchema.pre("validate", async function assignShopId() {
  if (this.shopId) {
    console.log("this.shopId in assignShopId", this.shopId);
    this.shopId = String(this.shopId).trim().toUpperCase();
    if (!/^SI\d{6}$/.test(this.shopId)) {
      throw new Error("shopId must match format SI000001");
    }
    return;
  }

  this.shopId = await generateNextShopId();
});

const ShopsData = mongoose.model("ShopsData", shopsDataSchema);

async function recordShopSmsUsage(shopId) {
  const normalizedShopId = String(shopId ?? "").trim().toUpperCase();
  if (!normalizedShopId) {
    return null;
  }

  const shop = await ShopsData.findOne({ shopId: normalizedShopId })
    .select("smsfeature.smsUsedInPeriod")
    .lean();

  if (!shop) {
    return null;
  }

  const currentUsedCount = shop.smsfeature?.smsUsedInPeriod ?? 0;
  const nextUsage = buildSmsUsageIncrementUpdate(currentUsedCount);

  await ShopsData.updateOne(
    { shopId: normalizedShopId },
    {
      $set: {
        "smsfeature.smsUsedInPeriod": nextUsage.smsUsedInPeriod,
        "smsfeature.smsPackageType": nextUsage.smsPackageType,
      },
    },
  );

  return nextUsage;
}

ShopsData.SHOP_STATUS = SHOP_STATUS;
ShopsData.ONBOARD_STEPS = ONBOARD_STEPS;
ShopsData.SUBSCRIPTION_TYPES = SUBSCRIPTION_TYPES;
ShopsData.SUBSCRIPTION_FEES = SUBSCRIPTION_FEES;
ShopsData.SMS_PACKAGES = SMS_PACKAGES;
ShopsData.SMS_PACKAGE_TYPES = SMS_PACKAGE_TYPES;
ShopsData.ADDITIONAL_USER_FEE_LKR = ADDITIONAL_USER_FEE_LKR;
ShopsData.WEB_MODULE_FEE_LKR = WEB_MODULE_FEE_LKR;
ShopsData.SUBSCRIPTION_DURATION_DAYS = SUBSCRIPTION_DURATION_DAYS;
ShopsData.getSubscriptionFee = getSubscriptionFee;
ShopsData.buildSubscriptionPlansList = buildSubscriptionPlansList;
ShopsData.findSmsPackageByUsage = findSmsPackageByUsage;
ShopsData.buildSmsUsageIncrementUpdate = buildSmsUsageIncrementUpdate;
ShopsData.recordShopSmsUsage = recordShopSmsUsage;

module.exports = ShopsData;

// below you can see all parameters for shopsDataSchema
//isFirstTime
// shopId: stringwwh
// shopName: string
// address: string
// shopMobileNumber: string
// ownerFirstName: string
// ownerLastName: string
// ownerMobileNumber: string
// email: string
// isVerifyEmail: boolean
// isVerifyPhoneNumber: boolean
// otp: number
// otpExpiresAt: date
// onboardStep: startOnboarding | shopRegistered | otpVerified | passwordSet | completed

// manageInventory removed — inventory is per product (Product.isInventoryAvailable)
// sendReceiptSms: boolean
// senderId: string | null
// smsPackageType: 0-500 | 500-1000 | ... | 4000-4500 (monthly message usage tier)
// smsMonthlyAllowance: number | null
// smsUsedInPeriod: number
// smsPackageAmount: number | null (monthly fee LKR)
// smsNextRenewalDate: date | null
// kpi: boolean
// analyticsModule: boolean
// smsMobileNumber: boolean
// customerManualOrder: boolean
// costModule: boolean
// marketingModule: boolean
// webModule: boolean (future — web portal add-on)
// webModuleEnabledAt: date | null

// maxUsers: number
// isAdditionalUsersAdded: boolean
// numAdditionalUsers: number
// additionalUsersPendingChange: removed — reductions apply immediately when valid

// status: string
// subscriptionStartDate: date
// currentPaymentDoneDate: date
// nextPaymentDate: date
// subsAmount: number
// subscriptionType: 1month | 3months | 6months | 1year
// subscriptionReceiptNo: subscription payment document id
// oneTimePaymentAmount: number | null
// isOneTimePaymentDone: boolean
// isOneTimePaymentGenerated: boolean
// oneTimePaymentReceiptNo: up-front payment document id
// subscriptionDueDays: number
// isTrailStared: boolean
// isTrailCompleted: boolean
// trailStartDate: date
// trailEndDate: date
