/**
 * Helper to determine local meal sessions and time-of-day dynamics
 * with respect to shop timezone (defaults to Asia/Colombo).
 */

const DEFAULT_TIMEZONE = 'Asia/Colombo';

const MEAL_SESSIONS = {
  BREAKFAST: {
    key: 'BREAKFAST',
    label: 'Breakfast Special',
    timeWindow: '06:00 - 10:59',
    startHour: 6,
    endHour: 11,
    defaultDiscount: 0.12, // 12% discount
  },
  LUNCH: {
    key: 'LUNCH',
    label: 'Power Lunch Combo',
    timeWindow: '11:00 - 14:59',
    startHour: 11,
    endHour: 15,
    defaultDiscount: 0.10, // 10% discount
  },
  SNACK: {
    key: 'SNACK',
    label: 'Evening Tea & Snack',
    timeWindow: '15:00 - 17:59',
    startHour: 15,
    endHour: 18,
    defaultDiscount: 0.15, // 15% discount
  },
  DINNER: {
    key: 'DINNER',
    label: 'Dinner Family Feast',
    timeWindow: '18:00 - 22:59',
    startHour: 18,
    endHour: 23,
    defaultDiscount: 0.10, // 10% discount
  },
  LATE_NIGHT: {
    key: 'LATE_NIGHT',
    label: 'Late Night Deal',
    timeWindow: '23:00 - 05:59',
    startHour: 23,
    endHour: 6,
    defaultDiscount: 0.08, // 8% discount
  },
};

/**
 * Returns current hour (0-23) in the target timezone
 */
function getLocalHour(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(date), 10);
  } catch {
    return date.getHours();
  }
}

/**
 * Resolves the operational meal session for a given timestamp
 */
function resolveMealSession(date = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const hour = getLocalHour(date, timeZone);

  if (hour >= 6 && hour < 11) return MEAL_SESSIONS.BREAKFAST;
  if (hour >= 11 && hour < 15) return MEAL_SESSIONS.LUNCH;
  if (hour >= 15 && hour < 18) return MEAL_SESSIONS.SNACK;
  if (hour >= 18 && hour < 23) return MEAL_SESSIONS.DINNER;
  return MEAL_SESSIONS.LATE_NIGHT;
}

module.exports = {
  MEAL_SESSIONS,
  getLocalHour,
  resolveMealSession,
  DEFAULT_TIMEZONE,
};
