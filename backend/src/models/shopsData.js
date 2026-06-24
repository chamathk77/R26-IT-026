const mongoose = require('mongoose');

const SHOP_STATUS = ['trial', 'active', 'disabled', 'due', 'trialExpired','diactiveByAdmin','diactiveByUser','initialPaymentPending','paymentPending'];

const SUBSCRIPTION_TYPES = ['1month', '3months', '6months', '1year'];

const ONBOARD_STEPS = [
  'startOnboarding',
  'shopRegistered',
  'otpVerified',
  'passwordSet',
  'featureSelected',
  'subscriptionSelected',
  'completed',
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
      default: 'startOnboarding',
    },
    // isFirstTime: {
    //   type: Boolean,
    //   default: true,
    // },

    //module related
    sendReceiptSms: {
      type: Boolean,
      default: false,
    },
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
    dueDays: {
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
  // onboardStep: startOnboarding | shopRegistered | featureSelected | completed

  // manageInventory removed — inventory is per product (Product.isInventoryAvailable)
  // sendReceiptSms: boolean
  // kpi: boolean
  // analyticsModule: boolean
  // smsMobileNumber: boolean
  // customerManualOrder: boolean
  // costModule: boolean
  // marketingModule: boolean


  // maxUsers: number
  // isAdditionalUsersAdded: boolean
  // numAdditionalUsers: number

  // status: string
  // subscriptionStartDate: date
  // currentPaymentDoneDate: date
  // nextPaymentDate: date
  // subsAmount: number
  // subscriptionType: 1month | 3months | 6months | 1year
  // oneTimePaymentAmount: number | null
  // isOneTimePaymentDone: boolean
  // isOneTimePaymentGenerated: boolean
  // dueDays: number
  // isTrailStared: boolean
  // isTrailCompleted: boolean
  // trailStartDate: date
  // trailEndDate: date










