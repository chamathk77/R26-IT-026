const TRIAL_DURATION_DAYS = 14;

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isTrialExpired(shop) {
  // check if trial is started and trail end date is set
  if (!shop?.isTrailStared || !shop.trailEndDate) {
    return false;
  }
  return Date.now() >= new Date(shop.trailEndDate).getTime();
}

function isTrialAccessBlocked(shop) {
  if (shop?.status === 'trialExpired') {
    return true;
  }
  return isTrialExpired(shop) && shop.status !== 'active';
}

function getTrialSecondsRemaining(shop) {
  if (!shop?.trailEndDate || shop.isTrailCompleted) {
    return 0;
  }
  const remainingMs = new Date(shop.trailEndDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

function getTokenExpiresInSeconds(shop) {
  const seconds = getTrialSecondsRemaining(shop);
  return seconds > 0 ? seconds : null;
}

function isActiveTrial(shop) {
  return (
    shop?.isTrailStared &&
    !shop.isTrailCompleted &&
    shop.status === 'trial' &&
    !isTrialExpired(shop)
  );
}

function isTrialPastEndDate(shop) {
  // check if trial is started and not completed and status is trial and trial is expired
  return (
    shop?.isTrailStared &&
    !shop.isTrailCompleted &&
    shop.status === 'trial' &&
    // check if trial is expired
    isTrialExpired(shop)
  );
}

async function markTrialAsExpired(shopDoc) {
  if (!shopDoc) {
    return shopDoc;
  }

  if (shopDoc.isTrailCompleted) {
    return shopDoc;
  }

  shopDoc.isTrailCompleted = true;
  shopDoc.status = 'trialExpired';
  await shopDoc.save();
  return shopDoc;
}

/** Manually end an active trial early (sets trailEndDate to now). */
async function finishTrialManually(shopDoc) {
  if (!shopDoc) {
    return shopDoc;
  }

  const now = new Date();
  shopDoc.isTrailStared = true;
  shopDoc.isTrailCompleted = true;
  shopDoc.status = 'trialExpired';
  shopDoc.trailEndDate = now;
  await shopDoc.save();
  return shopDoc;
}

async function completeTrialIfExpired(shopDoc) {
  // check if shop exists and trial is past end date
  if (!shopDoc || !isTrialPastEndDate(shopDoc)) {
    return shopDoc;
  }

  return markTrialAsExpired(shopDoc);
}

module.exports = {
  TRIAL_DURATION_DAYS,
  addDays,
  isTrialExpired,
  isTrialAccessBlocked,
  isActiveTrial,
  isTrialPastEndDate,
  getTrialSecondsRemaining,
  getTokenExpiresInSeconds,
  markTrialAsExpired,
  finishTrialManually,
  completeTrialIfExpired,
};
