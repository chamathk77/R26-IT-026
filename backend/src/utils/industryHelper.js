const ShopsData = require('../models/shopsData');

const INDUSTRY_TYPES = ShopsData.INDUSTRY_TYPES ?? ['retail', 'restaurant', 'salon', 'automotive'];

function normalizeIndustryType(value) {
  const normalized = String(value ?? 'retail').trim().toLowerCase();
  return INDUSTRY_TYPES.includes(normalized) ? normalized : 'retail';
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
    case 'automotive':
      return {
        automotiveModule: {
          quotations: true,
          warranty: true,
        },
      };
    default:
      return {};
  }
}

function buildIndustryOnboardingFields(industryTypeInput) {
  const industryType = normalizeIndustryType(industryTypeInput);
  return {
    industryType,
    ...buildIndustryModulePayload(industryType),
  };
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
    automotiveModule:
      industryType === 'automotive' && shop?.automotiveModule
        ? {
            quotations: Boolean(shop.automotiveModule.quotations),
            warranty: Boolean(shop.automotiveModule.warranty),
          }
        : null,
  };
}

module.exports = {
  INDUSTRY_TYPES,
  normalizeIndustryType,
  buildIndustryModulePayload,
  buildIndustryOnboardingFields,
  formatIndustryFieldsForClient,
};
