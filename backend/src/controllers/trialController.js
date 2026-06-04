const ShopsData = require('../models/shopsData');
const User = require('../models/user');
const {
  createAndSaveTrialToken,
  clearUserToken,
} = require('../utils/tokenHelper');
const {
  TRIAL_DURATION_DAYS,
  addDays,
  getTrialSecondsRemaining,
  getTokenExpiresInSeconds,
  isActiveTrial,
  isTrialPastEndDate,
  markTrialAsExpired,
  finishTrialManually,
} = require('../utils/trialHelper');

function parseStartTrialBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return null;
}

function buildTrialResponse(shop, { message, token, tokenExpiresInSeconds, alreadyActive = false }) {
  return {
    success: true,
    message,
    alreadyActive,
    shopId: shop.shopId,
    status: shop.status,
    isTrailStared: shop.isTrailStared,
    isTrailCompleted: shop.isTrailCompleted,
    trailStartDate: shop.trailStartDate,
    trailEndDate: shop.trailEndDate,
    trialDays: TRIAL_DURATION_DAYS,
    trialSecondsRemaining: getTrialSecondsRemaining(shop),
    tokenExpiresInSeconds,
    token: token ?? null,
  };
}

const startTrail = async (req, res) => {
  try {
    const { startTrial, shopId: bodyShopId } = req.body;
// parse start trial boolean
    const startTrialParsed = parseStartTrialBoolean(startTrial);
    // check if start trial is a boolean
    if (startTrialParsed === null) {
      return res.status(400).json({ success: false, message: 'startTrial must be a boolean' });
    }
    // check if start trial is true
    if (!startTrialParsed) {
      return res.status(400).json({ success: false, message: 'startTrial must be true to begin the trial' });
    }
    // check if user exists
    const user = await User.findById(req.user.id).select('shopId role').lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    // check if shop id is provided
    const shopId = (bodyShopId || user.shopId || '').trim().toUpperCase();
    if (!shopId) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }
    // check if shop id is the same as the user's shop id
    if (user.shopId && shopId !== user.shopId.trim().toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: 'You can only start a trial for your own shop',
      });
    }
    // check if shop exists
    let shop = await ShopsData.findOne({ shopId });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }
    // check if trial is past end date
    if (isTrialPastEndDate(shop)) {
      shop = await markTrialAsExpired(shop);
      await clearUserToken(req.user.id);
      return res.status(400).json({
        success: false,
        message: 'Your trial end date has already passed',
        shopId: shop.shopId,
        status: shop.status,
        isTrailCompleted: shop.isTrailCompleted,
        trailEndDate: shop.trailEndDate,
        trialExpired: true,
        sessionEnded: true,
      });
    }
    // check if trial is already active
    if (
      shop.status === 'trialExpired' ||
      (shop.isTrailCompleted && shop.isTrailStared)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Trial has already ended for this shop',
        shopId: shop.shopId,
        status: shop.status,
        isTrailCompleted: shop.isTrailCompleted,
        trailEndDate: shop.trailEndDate,
        trialExpired: true,
      });
    }
    // check if trial is already active
    const alreadyActive = isActiveTrial(shop);

    if (!alreadyActive) {
      const trailStartDate = new Date();
      const trailEndDate = addDays(trailStartDate, TRIAL_DURATION_DAYS);

      shop.isTrailStared = true;
      shop.isTrailCompleted = false;
      shop.trailStartDate = trailStartDate;
      shop.trailEndDate = trailEndDate;
      shop.status = 'trial';
      await shop.save();
    }

    const { token, tokenExpiresInSeconds } = await createAndSaveTrialToken(req.user.id, shop);

    await User.findByIdAndUpdate(req.user.id, { isFirsttimeLogin: false });

    res.status(200).json(
      buildTrialResponse(shop, {
        message: alreadyActive ? 'Trial is already active' : 'Trial started successfully',
        token,
        tokenExpiresInSeconds,
        alreadyActive,
      }),
    );
  } catch (error) {
    console.log('error in startTrail', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const skipTrail = async (req, res) => {
  try {
    const { shopId: bodyShopId } = req.body;

    const user = await User.findById(req.user.id).select('shopId role').lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const shopId = (bodyShopId || user.shopId || '').trim().toUpperCase();
    if (!shopId) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }

    if (user.shopId && shopId !== user.shopId.trim().toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: 'You can only skip trial for your own shop',
      });
    }

    const shop = await ShopsData.findOne({ shopId });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }

    if (shop.status !== 'trialExpired' || !shop.isTrailCompleted) {
      const now = new Date();
      shop.isTrailStared = true;
      shop.isTrailCompleted = true;
      shop.status = 'trialExpired';
      if (!shop.trailStartDate) {
        shop.trailStartDate = now;
      }
      shop.trailEndDate = now;
      await shop.save();
    }

    await clearUserToken(req.user.id);
    await User.findByIdAndUpdate(req.user.id, { isFirsttimeLogin: false });

    res.status(200).json({
      success: true,
      message: 'Trial skipped successfully',
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
    console.log('error in skipTrail', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const finishTrail = async (req, res) => {
  try {
    // check if shop id is provided
    const { shopId: bodyShopId } = req.body;
    // check if user exists
    const user = await User.findById(req.user.id).select('shopId role').lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    // check if shop id is provided
    const shopId = (bodyShopId || user.shopId || '').trim().toUpperCase();
    if (!shopId) {
      return res.status(400).json({ success: false, message: 'Shop id is required' });
    }
    // check if shop id is the same as the user's shop id
    if (user.shopId && shopId !== user.shopId.trim().toUpperCase()) {
      return res.status(403).json({
        success: false,
        message: 'You can only finish trial for your own shop',
      });
    }
    // check if shop exists
    let shop = await ShopsData.findOne({ shopId });
    if (!shop) {
      return res.status(404).json({ success: false, message: 'Shop not found' });
    }
    // check if trial is already finished
    if (shop.status === 'trialExpired' && shop.isTrailCompleted) {
      await clearUserToken(req.user.id);
      return res.status(200).json({
        success: true,
        message: 'Trial is already finished',
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

    if (!shop.isTrailStared || shop.status !== 'trial') {
      return res.status(400).json({
        success: false,
        message: 'No active trial to finish. Start a trial first or use skip trial.',
        shopId: shop.shopId,
        status: shop.status,
        isTrailStared: shop.isTrailStared,
      });
    }

    shop = await finishTrialManually(shop);
    await clearUserToken(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Trial finished successfully',
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
    console.log('error in finishTrail', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { startTrail, skipTrail, finishTrail };
