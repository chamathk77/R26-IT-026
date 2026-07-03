const mongoose = require('mongoose');

const SHOP_STATUS = [
  'disabled', 
  'trial', 
  'trialExpired',
  'initialPaymentApproved',
  'subscriptionPaymentPending',
  'active', 
  'due', 
  'paymentPending',
  'diactiveByAdmin',
];

const SUBSCRIPTION_TYPES = ['1month', '3months', '6months', '1year'];

const SUBSCRIPTION_FEES = [
  { type: '1month', fee: 4900 },
  { type: '3months', fee: 13800 },
  { type: '6months', fee: 26400 },
  { type: '1year', fee: 51600 },
];

const SMS_PACKAGES = [
  { type: '500', messageCount: 500, fee: 575 },
  { type: '1000', messageCount: 1000, fee: 1150 },
  { type: '1500', messageCount: 1500, fee: 1725 },
  { type: '2000', messageCount: 2000, fee: 2300 },
  { type: '2500', messageCount: 2500, fee: 2875 },
  { type: '3000', messageCount: 3000, fee: 3450 },
  { type: '3500', messageCount: 3500, fee: 4025 },
  { type: '4000', messageCount: 4000, fee: 4600 },
  { type: '4500', messageCount: 4500, fee: 5175 },
];

const SMS_PACKAGE_TYPES = SMS_PACKAGES.map((pkg) => pkg.type);

/** Per additional user monthly fee (LKR). Change here to update billing everywhere. */
const ADDITIONAL_USER_FEE_LKR = 499;

/** Web portal add-on monthly fee (LKR). Billing integration — future release. */
const WEB_MODULE_FEE_LKR = 2990;

const SUBSCRIPTION_DURATION_DAYS = {
  '1month': 30,
  '3months': 90,
  '6months': 180,
  '1year': 360,
};

/** Days before nextPaymentDate when additional-user reductions must be scheduled. */
const ADDITIONAL_USERS_REDUCTION_CUTOFF_DAYS = {
  '1month': 10,
  '3months': 15,
  '6months': 30,
  '1year': 45,
};

function getSubscriptionFee(subscriptionType) {
  const entry = SUBSCRIPTION_FEES.find((item) => item.type === subscriptionType);
  return entry?.fee ?? null;
}

function getSubscriptionSaveAmount(subscriptionType, fee) {
  const oneMonthFee = getSubscriptionFee('1month');
  const includedDays = SUBSCRIPTION_DURATION_DAYS[subscriptionType];
  const oneMonthDays = SUBSCRIPTION_DURATION_DAYS['1month'];

  if (!oneMonthFee || !includedDays || !oneMonthDays || subscriptionType === '1month') {
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
  'startOnboarding',
  'shopRegistered',
  'otpVerified',
  'passwordSet',
  'completed',
];

const additionalUsersPendingChangeSchema = new mongoose.Schema(
  {
    isAdditionalUsersAdded: {
      type: Boolean,
      required: true,
    },
    numAdditionalUsers: {
      type: Number,
      default: null,
      min: 0,
    },
    requestedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false },
);

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
      default: 'startOnboarding',
    },
    //module related
    senderId: {
      type: String,
      default: null,
      trim: true,
    },

    //sms related
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
    smsFeatureStatus: {
      type: String,
      enum: ['inactive', 'active', 'pending', 'due', 'disabled'],
      default: 'disabled',
    },
    smsPackageAmount: {
      type: Number,
      default: null,
      min: 0,
    },
    smsStartDate: {
      type: Date,
      default: null,
    },
    smsNextRenewalDate: {
      type: Date,
      default: null,
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
    additionalUsersPendingChange: {
      type: additionalUsersPendingChangeSchema,
      default: null,
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
      default: 'disabled', // disabled, trial, active, due,trialExpired
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
    subscriptionReceiptNo:{
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
    oneTimePaymentReceiptNo:{
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
  const ShopsData = mongoose.model('ShopsData');
  const lastShop = await ShopsData.findOne({ shopId: /^SI\d{6}$/i }, { shopId: 1 })
    .sort({ shopId: -1 })
    .lean();

  if (!lastShop?.shopId) {
    return 'SI000001';
  }

  const match = String(lastShop.shopId).match(/^SI(\d{6})$/i);
  const nextNumber = match ? Number.parseInt(match[1], 10) + 1 : 1;
  return `SI${String(nextNumber).padStart(6, '0')}`;
}

shopsDataSchema.pre('validate', async function assignShopId() {
  if (this.shopId) {
    console.log('this.shopId in assignShopId', this.shopId);
    this.shopId = String(this.shopId).trim().toUpperCase();
    if (!/^SI\d{6}$/.test(this.shopId)) {
      throw new Error('shopId must match format SI000001');
    }
    return;
  }

  this.shopId = await generateNextShopId();
});

const ShopsData = mongoose.model('ShopsData', shopsDataSchema);

ShopsData.SHOP_STATUS = SHOP_STATUS;
ShopsData.ONBOARD_STEPS = ONBOARD_STEPS;
ShopsData.SUBSCRIPTION_TYPES = SUBSCRIPTION_TYPES;
ShopsData.SUBSCRIPTION_FEES = SUBSCRIPTION_FEES;
ShopsData.SMS_PACKAGES = SMS_PACKAGES;
ShopsData.SMS_PACKAGE_TYPES = SMS_PACKAGE_TYPES;
ShopsData.ADDITIONAL_USER_FEE_LKR = ADDITIONAL_USER_FEE_LKR;
ShopsData.WEB_MODULE_FEE_LKR = WEB_MODULE_FEE_LKR;
ShopsData.SUBSCRIPTION_DURATION_DAYS = SUBSCRIPTION_DURATION_DAYS;
ShopsData.ADDITIONAL_USERS_REDUCTION_CUTOFF_DAYS = ADDITIONAL_USERS_REDUCTION_CUTOFF_DAYS;
ShopsData.getSubscriptionFee = getSubscriptionFee;
ShopsData.buildSubscriptionPlansList = buildSubscriptionPlansList;

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
  // smsPackageType: 500 | 1000 | ... | 4500 (monthly message quota)
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
  // additionalUsersPendingChange: { isAdditionalUsersAdded, numAdditionalUsers, requestedAt }

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










