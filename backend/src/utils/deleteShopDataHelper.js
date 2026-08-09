const ShopsData = require('../models/shopsData');
const SalePerson = require('../models/salePerson');
const Product = require('../models/product');
const Payments = require('../models/payments');
const History = require('../models/history');
const User = require('../models/user');
const Branch = require('../models/branch');
const BranchStock = require('../models/branchStock');
const Category = require('../models/category');
const Cart = require('../models/cart');
const CostCategory = require('../models/costCategory');
const CostExpense = require('../models/costExpense');
const Customer = require('../models/customer');
const BulkProductImportResult = require('../models/bulkProductImportResult');
const DueDaysCronReport = require('../models/dueDaysCronReport');
const TrialCronReport = require('../models/trialCronReport');
const SmsDueDaysCronReport = require('../models/smsDueDaysCronReport');
const SmsBillCronReport = require('../models/smsBillCronReport');
const BillingCronReport = require('../models/billingCronReport');

/**
 * Scrub a shopId from nested cron reportData arrays (reports are system-wide).
 */
async function scrubShopFromCronReports(shopId) {
  const shopPull = { shopId };

  const [dueDays, trial, smsDue, smsBill, billing] = await Promise.all([
    DueDaysCronReport.updateMany(
      {},
      {
        $pull: {
          'reportData.subscription': shopPull,
          'reportData.sms': shopPull,
          'reportData.skipped': shopPull,
          'reportData.errors': shopPull,
        },
      },
    ),
    TrialCronReport.updateMany(
      {},
      {
        $pull: {
          'reportData.expired': shopPull,
          'reportData.skipped': shopPull,
          'reportData.errors': shopPull,
        },
      },
    ),
    SmsDueDaysCronReport.updateMany(
      {},
      {
        $pull: {
          'reportData.processed': shopPull,
          'reportData.escalated': shopPull,
          'reportData.skipped': shopPull,
          'reportData.errors': shopPull,
        },
      },
    ),
    SmsBillCronReport.updateMany(
      {},
      {
        $pull: {
          'reportData.invoiced': shopPull,
          'reportData.skipped': shopPull,
          'reportData.errors': shopPull,
        },
      },
    ),
    BillingCronReport.updateMany(
      {},
      {
        $pull: {
          'reportData.invoiced': shopPull,
          'reportData.skipped': shopPull,
          'reportData.errors': shopPull,
        },
      },
    ),
  ]);

  return {
    dueDaysCronReportsModified: dueDays.modifiedCount,
    trialCronReportsModified: trial.modifiedCount,
    smsDueDaysCronReportsModified: smsDue.modifiedCount,
    smsBillCronReportsModified: smsBill.modifiedCount,
    billingCronReportsModified: billing.modifiedCount,
  };
}

/**
 * Permanently delete all records scoped to a shopId across every shop collection.
 */
async function deleteAllShopScopedData(shopId) {
  const shopFilter = { shopId };

  const [
    usersResult,
    salePersonsResult,
    productsResult,
    categoriesResult,
    cartsResult,
    customersResult,
    costCategoriesResult,
    costExpensesResult,
    bulkImportResultsResult,
    paymentsResult,
    historyResult,
    branchStockResult,
    branchesResult,
    shopsResult,
    cronScrub,
  ] = await Promise.all([
    User.deleteMany(shopFilter),
    SalePerson.deleteMany(shopFilter),
    Product.deleteMany(shopFilter),
    Category.deleteMany(shopFilter),
    Cart.deleteMany(shopFilter),
    Customer.deleteMany(shopFilter),
    CostCategory.deleteMany(shopFilter),
    CostExpense.deleteMany(shopFilter),
    BulkProductImportResult.deleteMany(shopFilter),
    Payments.deleteMany(shopFilter),
    History.deleteMany(shopFilter),
    BranchStock.deleteMany(shopFilter),
    Branch.deleteMany(shopFilter),
    ShopsData.deleteOne(shopFilter),
    scrubShopFromCronReports(shopId),
  ]);

  return {
    deleted: {
      shopsData: shopsResult.deletedCount,
      users: usersResult.deletedCount,
      salePersons: salePersonsResult.deletedCount,
      products: productsResult.deletedCount,
      categories: categoriesResult.deletedCount,
      carts: cartsResult.deletedCount,
      customers: customersResult.deletedCount,
      costCategories: costCategoriesResult.deletedCount,
      costExpenses: costExpensesResult.deletedCount,
      bulkProductImportResults: bulkImportResultsResult.deletedCount,
      payments: paymentsResult.deletedCount,
      history: historyResult.deletedCount,
      branchStock: branchStockResult.deletedCount,
      branches: branchesResult.deletedCount,
    },
    cronReportsScrubbed: cronScrub,
  };
}

module.exports = {
  scrubShopFromCronReports,
  deleteAllShopScopedData,
};
