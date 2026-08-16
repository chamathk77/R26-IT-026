const mongoose = require("mongoose");

const SHOP_STATUS = [
  "disabled",
  "trial",
  "trialExpired",
  "initialPaymentApproved",
  "subscriptionPaymentPending",
  
  "active",
  // if payment invoice sent but not paid
  "due",
  //if payment is over due for 14 days
  "paymentPending",

  // if user wants to change the subscription plan
  "changeSubscription",

  // if user wants to change the subscription plan
  "diactiveByAdmin",
];

const SUBSCRIPTION_TYPES = ["1month", "3months", "6months", "1year"];

const SUBSCRIPTION_FEES = [
  { type: "1month", fee: 2900 },
  { type: "3months", fee: 8000 },
  { type: "6months", fee: 15600 },
  { type: "1year", fee: 30600 },
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
const ADDITIONAL_USER_FEE_LKR = 290;

/** Billing period length in months per subscription plan (for additional-user charges). */
const SUBSCRIPTION_BILLING_MONTHS = {
  "1month": 1,
  "3months": 3,
  "6months": 6,
  "1year": 12,
};

function getSubscriptionBillingMonths(subscriptionType) {
  return SUBSCRIPTION_BILLING_MONTHS[subscriptionType] ?? null;
}

function calculateAdditionalUsersFee(subscriptionType, numAdditionalUsers) {
  const count = Number.parseInt(String(numAdditionalUsers ?? ""), 10);
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }

  const billingMonths = getSubscriptionBillingMonths(subscriptionType);
  if (!billingMonths) {
    return 0;
  }

  return billingMonths * count * ADDITIONAL_USER_FEE_LKR;
}

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

const INDUSTRY_TYPES = ["retail", "restaurant", "salon", "automotive"];

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
    industryType: {
      type: String,
      enum: INDUSTRY_TYPES,
      default: "retail",
    },
    /** Set when industryType is restaurant (created on onboarding). */
    restaurantModule: {
      kitchenOrders: {
        type: Boolean,
        default: false,
      },
      tableManagement: {
        type: Boolean,
        default: false,
      },
      // portionSales: {
      //   type: Boolean,
      //   default: false,
      // },
    },
    /** Set when industryType is salon (created on onboarding). */
    salonModule: {
      appointments: {
        type: Boolean,
        default: false,
      },
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

      // Set when usage > 100 blocks immediate deactivation; apply after month SMS bill is approved
      isSmsDeactivationScheduled: {
        type: Boolean,
        default: false,
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
    /** Product warranty tracking on bills/history (dashboard toggle only). */
    warrantyModule: {
      type: Boolean,
      default: false,
    },
    /** Cross-industry quotations / estimates (dashboard toggle only). */
    quotationsModule: {
      type: Boolean,
      default: false,
    },
    /** Per-shop taxes and percentage charges (VAT, service charge, etc.) — dashboard only. */
    billingConfig: {
      taxes: {
        type: [
          {
            id: { type: String, required: true, trim: true },
            label: { type: String, required: true, trim: true },
            rate: { type: Number, min: 0, max: 100, default: 0 },
            enabled: { type: Boolean, default: false },
          },
        ],
        default: [],
      },
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

    // Set when shop requests a plan change while on a current plan; apply after billing cycle / approval
    isSubscriptionChangePending: {
      type: Boolean,
      default: false,
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
ShopsData.INDUSTRY_TYPES = INDUSTRY_TYPES;
ShopsData.SUBSCRIPTION_TYPES = SUBSCRIPTION_TYPES;
ShopsData.SUBSCRIPTION_FEES = SUBSCRIPTION_FEES;
ShopsData.SMS_PACKAGES = SMS_PACKAGES;
ShopsData.SMS_PACKAGE_TYPES = SMS_PACKAGE_TYPES;
ShopsData.ADDITIONAL_USER_FEE_LKR = ADDITIONAL_USER_FEE_LKR;
ShopsData.SUBSCRIPTION_BILLING_MONTHS = SUBSCRIPTION_BILLING_MONTHS;
ShopsData.getSubscriptionBillingMonths = getSubscriptionBillingMonths;
ShopsData.calculateAdditionalUsersFee = calculateAdditionalUsersFee;
ShopsData.WEB_MODULE_FEE_LKR = WEB_MODULE_FEE_LKR;
ShopsData.SUBSCRIPTION_DURATION_DAYS = SUBSCRIPTION_DURATION_DAYS;
ShopsData.getSubscriptionFee = getSubscriptionFee;
ShopsData.buildSubscriptionPlansList = buildSubscriptionPlansList;
ShopsData.findSmsPackageByUsage = findSmsPackageByUsage;
ShopsData.buildSmsUsageIncrementUpdate = buildSmsUsageIncrementUpdate;
ShopsData.recordShopSmsUsage = recordShopSmsUsage;

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function normalizeSubscriptionType(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!SUBSCRIPTION_TYPES.includes(normalized)) {
    return null;
  }
  return normalized;
}

/**
 * Apply a new 1-month subscription plan after the shop enters changeSubscription status.
 * Multi-month plan changes create an invoice via createChangeSubscriptionMultiMonthInvoice.
 */
async function selectNewSubscription(shopId, subscriptionType) {
  const normalizedShopId = String(shopId ?? "").trim().toUpperCase();
  if (!normalizedShopId) {
    return { error: "shop_id_required" };
  }

  const normalizedType = normalizeSubscriptionType(subscriptionType);
  if (!normalizedType) {
    return { error: "invalid_subscription_type", validTypes: SUBSCRIPTION_TYPES };
  }

  if (normalizedType !== "1month") {
    return {
      error: "multi_month_requires_invoice",
      subscriptionType: normalizedType,
    };
  }

  const shop = await ShopsData.findOne({ shopId: normalizedShopId })
    .select("shopId status subscriptionType nextPaymentDate")
    .lean();

  if (!shop) {
    return { error: "shop_not_found" };
  }

  if (shop.status !== "changeSubscription") {
    return { error: "invalid_shop_status", status: shop.status };
  }

  const today = startOfDay();
  const update = {
    subscriptionType: normalizedType,
    subscriptionReceiptNo: null,
    subscriptionDueDays: 0,
    nextPaymentDate: startOfDay(addDays(today, SUBSCRIPTION_DURATION_DAYS["1month"])),
    status: "active",
  };

  const updated = await ShopsData.findOneAndUpdate(
    { shopId: normalizedShopId },
    { $set: update },
    { returnDocument: "after", runValidators: true },
  )
    .select("shopId subscriptionType status nextPaymentDate")
    .lean();

  return { shop: updated };
}

ShopsData.selectNewSubscription = selectNewSubscription;

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
// industryType: retail | restaurant | salon | automotive
// restaurantModule: { kitchenOrders, tableManagement, portionSales } — populated when industryType is restaurant
// salonModule: { appointments } — populated when industryType is salon
// quotationsModule: boolean (cross-industry quotations — dashboard toggle only)

// manageInventory removed — inventory is per product (Product.isInventoryAvailable)
// sendReceiptSms: boolean
// senderId: string | null
// smsPackageType: 0-500 | 500-1000 | ... | 4000-4500 (monthly message usage tier)
// smsMonthlyAllowance: number | null
// smsUsedInPeriod: number
// isSmsFeatureActive: boolean
// smsFeatureStatus: notActivated | active | pending | due | inactive
// smsNextRenewalDate: date | null
// smsDueDays: number
// smsReceiptNo: string | null
// isSmsDeactivationScheduled: boolean (queued deactivate after SMS bill approve when usage > 100)
// kpi: boolean
// analyticsModule: boolean
// smsMobileNumber: boolean
// customerManualOrder: boolean
// costModule: boolean
// marketingModule: boolean
// warrantyModule: boolean (product warranty on bills/history — dashboard toggle only)
// quotationsModule: boolean (quotations / estimates — dashboard toggle only)
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
// isSubscriptionChangePending: boolean (queued plan change while on current subscription)
// pendingSubscriptionType: 1month | 3months | 6months | 1year | null (requested plan when change is pending)
// isTrailStared: boolean
// isTrailCompleted: boolean
// trailStartDate: date
// trailEndDate: date
