const ShopsData = require('../models/shopsData');

const INDUSTRY_TYPES = ShopsData.INDUSTRY_TYPES ?? ['retail', 'restaurant', 'salon', 'automotive'];

function normalizeIndustryType(value) {
  const normalized = String(value ?? 'retail').trim().toLowerCase();
  return INDUSTRY_TYPES.includes(normalized) ? normalized : 'retail';
}

/** Legacy automotive shops stored quotations under automotiveModule.quotations. */
function resolveQuotationsModule(shop) {
  if (shop?.quotationsModule === true) {
    return true;
  }

  if (shop?.quotationsModule === false) {
    return false;
  }

  return Boolean(shop?.automotiveModule?.quotations);
}

/** Keep top-level and legacy automotive flags in sync when dashboard toggles quotations. */
function applyQuotationsModuleUpdate(update, enabled) {
  update.quotationsModule = enabled;
  update['automotiveModule.quotations'] = enabled;
}

/** Industry module defaults — only the matching module object is returned. */
function buildIndustryModulePayload(industryType) {
  switch (industryType) {
    case 'restaurant':
      return {
        restaurantModule: {
          kitchenOrders: true,
          tableManagement: true,
          portionSales: true,
        },
      };
    case 'salon':
      return {
        salonModule: {
          appointments: true,
        },
      };
    default:
      return {};
  }
}

function buildIndustryOnboardingFields(industryTypeInput) {
  const industryType = normalizeIndustryType(industryTypeInput);
  const payload = {
    industryType,
    ...buildIndustryModulePayload(industryType),
  };

  if (industryType === 'automotive') {
    payload.quotationsModule = true;
  }

  return payload;
}

/** Normalized industry + module flags for API clients (login, dashboard). */
function formatIndustryFieldsForClient(shop) {
  const industryType = normalizeIndustryType(shop?.industryType);

  return {
    industryType,
    restaurantModule:
      industryType === 'restaurant' && shop?.restaurantModule
        ? {
            kitchenOrders: Boolean(shop.restaurantModule.kitchenOrders),
            tableManagement: Boolean(shop.restaurantModule.tableManagement),
          }
        : null,
    salonModule:
      industryType === 'salon' && shop?.salonModule
        ? {
            appointments: Boolean(shop.salonModule.appointments),
          }
        : null,
  };
}

module.exports = {
  INDUSTRY_TYPES,
  normalizeIndustryType,
  resolveQuotationsModule,
  applyQuotationsModuleUpdate,
  buildIndustryModulePayload,
  buildIndustryOnboardingFields,
  formatIndustryFieldsForClient,
};
