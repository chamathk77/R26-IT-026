require('dotenv').config();

const mongoose = require('mongoose');
const { connectDatabase } = require('../../../config/database');

const ShopsData = require('../../../models/shopsData');
const Branch = require('../../../models/branch');
const User = require('../../../models/user');
const Category = require('../../../models/category');
const Product = require('../../../models/product');
const BranchStock = require('../../../models/branchStock');
const CostCategory = require('../../../models/costCategory');
const CostExpense = require('../../../models/costExpense');
const History = require('../../../models/history');

const DEFAULT_MONTHS = 24;
const DEFAULT_SEED = 20260816;
const BASE_ORDERS_PER_DAY = 18;
const MONTHLY_GROWTH_RATE = 0.006;
const INGREDIENT_COST_RATIO = 0.32;
const INSERT_CHUNK_SIZE = 1000;

/** Jan..Dec demand multipliers — April (New Year) and December peak. */
const MONTH_SEASONALITY = [
  0.88, 0.9, 0.97, 1.18, 1.0, 0.92, 1.02, 1.1, 0.95, 0.98, 1.05, 1.28,
];

/** Sun..Sat multipliers — weekends carry a restaurant. */
const WEEKDAY_SEASONALITY = [1.2, 0.85, 0.85, 0.9, 1.0, 1.25, 1.4];

const CATEGORY_SEED = [
  { name: 'Rice & Curry', colorCode: '#F59E0B' },
  { name: 'Kottu & Fried Rice', colorCode: '#EF4444' },
  { name: 'Seafood', colorCode: '#0EA5E9' },
  { name: 'Beverages', colorCode: '#10B981' },
  { name: 'Desserts', colorCode: '#A855F7' },
];

const PRODUCT_SEED = [
  { name: 'Chicken Rice & Curry', category: 'Rice & Curry', price: 850, cost: 520, weight: 10 },
  { name: 'Fish Rice & Curry', category: 'Rice & Curry', price: 780, cost: 470, weight: 8 },
  { name: 'Vegetable Rice & Curry', category: 'Rice & Curry', price: 550, cost: 300, weight: 7 },
  { name: 'Egg Rice & Curry', category: 'Rice & Curry', price: 600, cost: 340, weight: 5 },
  { name: 'Chicken Kottu', category: 'Kottu & Fried Rice', price: 950, cost: 560, weight: 12 },
  { name: 'Cheese Kottu', category: 'Kottu & Fried Rice', price: 1250, cost: 760, weight: 7 },
  { name: 'Vegetable Kottu', category: 'Kottu & Fried Rice', price: 700, cost: 390, weight: 6 },
  { name: 'Chicken Fried Rice', category: 'Kottu & Fried Rice', price: 900, cost: 540, weight: 9 },
  { name: 'Mixed Fried Rice', category: 'Kottu & Fried Rice', price: 1100, cost: 680, weight: 6 },
  { name: 'Devilled Prawns', category: 'Seafood', price: 1650, cost: 1050, weight: 5 },
  { name: 'Grilled Seer Fish', category: 'Seafood', price: 1850, cost: 1200, weight: 4 },
  { name: 'Cuttlefish Curry', category: 'Seafood', price: 1450, cost: 900, weight: 3 },
  { name: 'Crab Curry', category: 'Seafood', price: 2400, cost: 1600, weight: 2 },
  { name: 'Fresh Lime Juice', category: 'Beverages', price: 320, cost: 120, weight: 11 },
  { name: 'Iced Coffee', category: 'Beverages', price: 480, cost: 190, weight: 8 },
  { name: 'King Coconut', category: 'Beverages', price: 250, cost: 110, weight: 7 },
  { name: 'Soft Drink', category: 'Beverages', price: 220, cost: 140, weight: 9 },
  { name: 'Watalappan', category: 'Desserts', price: 450, cost: 210, weight: 6 },
  { name: 'Curd & Treacle', category: 'Desserts', price: 380, cost: 170, weight: 5 },
  { name: 'Chocolate Biscuit Pudding', category: 'Desserts', price: 520, cost: 260, weight: 4 },
];

const COST_CATEGORY_SEED = [
  { name: 'Ingredients & Supplies', colorCode: '#F97316' },
  { name: 'Salaries & Wages', colorCode: '#3B82F6' },
  { name: 'Rent', colorCode: '#8B5CF6' },
  { name: 'Utilities', colorCode: '#14B8A6' },
  { name: 'Marketing', colorCode: '#EC4899' },
  { name: 'Maintenance', colorCode: '#64748B' },
];

const PAYMENT_OPTIONS = ['cash', 'card', 'online'];

/** Deterministic PRNG so every run reproduces the identical dataset. */
function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(random, min, max) {
  return min + random() * (max - min);
}

function randomInt(random, min, max) {
  return Math.floor(randomBetween(random, min, max + 1));
}

function pickWeighted(random, items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let threshold = random() * totalWeight;
  for (const item of items) {
    threshold -= item.weight;
    if (threshold <= 0) return item;
  }
  return items[items.length - 1];
}

function parseArgs(argv) {
  const args = { reset: false, months: DEFAULT_MONTHS, seed: DEFAULT_SEED };

  for (const arg of argv) {
    if (arg === '--reset') args.reset = true;
    else if (arg.startsWith('--months=')) args.months = Number(arg.split('=')[1]);
    else if (arg.startsWith('--seed=')) args.seed = Number(arg.split('=')[1]);
    else if (arg.startsWith('--shopId=')) args.shopId = arg.split('=')[1].trim().toUpperCase();
    else if (arg.startsWith('--branchId=')) args.branchId = arg.split('=')[1].trim().toUpperCase();
  }

  if (!Number.isFinite(args.months) || args.months < 3) {
    throw new Error('--months must be a number >= 3');
  }

  return args;
}

async function resolveTarget(args) {
  const shop = args.shopId
    ? await ShopsData.findOne({ shopId: args.shopId }).lean()
    : await ShopsData.findOne().lean();

  if (!shop) {
    throw new Error('No shop found. Complete onboarding in the app first.');
  }

  const branch = args.branchId
    ? await Branch.findOne({ shopId: shop.shopId, branchId: args.branchId }).lean()
    : await Branch.findOne({ shopId: shop.shopId }).lean();

  if (!branch) {
    throw new Error(`No branch found for shop ${shop.shopId}.`);
  }

  const user =
    (await User.findOne({ shopId: shop.shopId, role: 'owner' }).lean()) ||
    (await User.findOne({ shopId: shop.shopId }).lean());

  if (!user) {
    throw new Error(`No user found for shop ${shop.shopId}.`);
  }

  return { shop, branch, user };
}

async function resetSeededData(shopId, branchId) {
  const results = await Promise.all([
    History.deleteMany({ shopId, branchId }),
    CostExpense.deleteMany({ shopId, branchId }),
    BranchStock.deleteMany({ shopId, branchId }),
    Product.deleteMany({ shopId }),
    Category.deleteMany({ shopId }),
    CostCategory.deleteMany({ shopId }),
  ]);

  const [history, costs, stock, products, categories, costCategories] = results;
  console.log(
    `  cleared: ${history.deletedCount} sales, ${costs.deletedCount} expenses, ${products.deletedCount} products, ${categories.deletedCount} categories, ${costCategories.deletedCount} cost categories, ${stock.deletedCount} stock rows`,
  );
}

async function seedCatalog(shopId, branchId, user) {
  const categoryDocs = await Category.insertMany(
    CATEGORY_SEED.map((category) => ({
      shopId,
      name: category.name,
      description: `${category.name} menu items`,
      colorCode: category.colorCode,
      createdBy: user._id,
      createdByName: user.name,
    })),
  );

  const categoryByName = new Map(categoryDocs.map((doc) => [doc.name, doc]));

  const productDocs = await Product.insertMany(
    PRODUCT_SEED.map((product, index) => {
      const category = categoryByName.get(product.category);
      return {
        shopId,
        productName: product.name,
        categoryId: category._id,
        categoryName: category.name,
        type: 'product',
        amount: product.price,
        cost: product.cost,
        isInventoryAvailable: true,
        productNumber: String(101 + index),
        createdBy: user._id,
      };
    }),
  );

  await BranchStock.insertMany(
    productDocs.map((product) => ({
      shopId,
      branchId,
      productId: product._id,
      qty: 250,
    })),
  );

  const costCategoryDocs = await CostCategory.insertMany(
    COST_CATEGORY_SEED.map((category) => ({
      shopId,
      name: category.name,
      colorCode: category.colorCode,
      createdBy: user._id,
      createdByName: user.name,
    })),
  );

  console.log(
    `  catalog: ${categoryDocs.length} categories, ${productDocs.length} products, ${costCategoryDocs.length} cost categories`,
  );

  const catalog = productDocs.map((doc) => {
    const seed = PRODUCT_SEED.find((item) => item.name === doc.productName);
    return {
      _id: doc._id,
      productName: doc.productName,
      price: doc.amount,
      cost: doc.cost,
      weight: seed.weight,
    };
  });

  return { catalog, costCategoryDocs };
}

function buildMonthWindows(monthCount, now) {
  const windows = [];
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1), 1);

  for (let i = 0; i < monthCount; i += 1) {
    const start = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + i, 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const isCurrentMonth =
      start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth();
    const lastDay = isCurrentMonth ? now.getDate() : monthEnd.getDate();

    windows.push({ start, lastDay, monthIndex: i, isCurrentMonth });
  }

  return windows;
}

function generateSalesForMonth(window, context) {
  const { random, catalog, shopId, branchId, user, counters } = context;
  const orders = [];

  const growthFactor = (1 + MONTHLY_GROWTH_RATE) ** window.monthIndex;
  const seasonFactor = MONTH_SEASONALITY[window.start.getMonth()];

  for (let day = 1; day <= window.lastDay; day += 1) {
    const date = new Date(window.start.getFullYear(), window.start.getMonth(), day);
    const weekdayFactor = WEEKDAY_SEASONALITY[date.getDay()];
    const noise = randomBetween(random, 0.82, 1.18);

    const orderCount = Math.max(
      1,
      Math.round(BASE_ORDERS_PER_DAY * growthFactor * seasonFactor * weekdayFactor * noise),
    );

    for (let i = 0; i < orderCount; i += 1) {
      const itemCount = randomInt(random, 1, 4);
      const items = [];
      let subtotal = 0;

      for (let j = 0; j < itemCount; j += 1) {
        const product = pickWeighted(random, catalog);
        const qty = randomInt(random, 1, 3);
        subtotal += product.price * qty;
        items.push({
          productId: product._id,
          productName: product.productName,
          qty,
          unitCost: product.cost,
        });
      }

      const hour = randomInt(random, 10, 21);
      const minute = randomInt(random, 0, 59);
      const checkOutTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hour,
        minute,
        randomInt(random, 0, 59),
      );

      counters.cartNumber += 1;
      counters.orderNumber += 1;

      orders.push({
        shopId,
        branchId,
        cartId: new mongoose.Types.ObjectId(),
        cartNumber: counters.cartNumber,
        orderId: `ORD${String(counters.orderNumber).padStart(6, '0')}`,
        checkOutTime,
        amount: subtotal,
        isDiscount: false,
        discountedAmount: 0,
        taxAmount: 0,
        serviceChargeAmount: 0,
        items,
        totalAmount: subtotal,
        customerName: '',
        customerMobile: '',
        userId: user._id,
        submittedUserId: user._id,
        submittedUserName: user.name,
        paymentOption: PAYMENT_OPTIONS[randomInt(random, 0, PAYMENT_OPTIONS.length - 1)],
        status: 'submited',
        orderType: 'dine_in',
        createdAt: checkOutTime,
        updatedAt: checkOutTime,
      });
    }
  }

  return orders;
}

function generateCostsForMonth(window, monthlySales, context) {
  const { random, costCategoryByName, shopId, branchId, user, counters } = context;
  const expenses = [];

  const addExpense = (categoryName, expenseName, amount, date) => {
    const category = costCategoryByName.get(categoryName);
    counters.expenseNumber += 1;
    expenses.push({
      shopId,
      branchId,
      expenseId: `EXP${String(counters.expenseNumber).padStart(6, '0')}`,
      expenseName,
      categoryId: category._id,
      categoryName: category.name,
      amount: Number(amount.toFixed(2)),
      isProduct: false,
      createdBy: user._id,
      purchaseDate: date,
      createdAt: date,
      updatedAt: date,
    });
  };

  const dayIn = (day) =>
    new Date(
      window.start.getFullYear(),
      window.start.getMonth(),
      Math.min(day, window.lastDay),
      10,
      0,
      0,
    );

  const growthFactor = (1 + MONTHLY_GROWTH_RATE) ** window.monthIndex;

  addExpense('Rent', 'Monthly premises rent', 85000, dayIn(1));
  addExpense(
    'Salaries & Wages',
    'Staff salaries',
    220000 * growthFactor * randomBetween(random, 0.98, 1.03),
    dayIn(28),
  );
  addExpense(
    'Utilities',
    'Electricity, water & gas',
    38000 * growthFactor * randomBetween(random, 0.88, 1.15),
    dayIn(5),
  );

  const ingredientBudget = monthlySales * INGREDIENT_COST_RATIO;
  const purchaseDays = [3, 10, 17, 24];
  const weights = purchaseDays.map(() => randomBetween(random, 0.8, 1.2));
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);

  purchaseDays.forEach((day, index) => {
    if (day > window.lastDay) return;
    const share = weights[index] / weightTotal;
    addExpense(
      'Ingredients & Supplies',
      `Weekly supplier purchase (week ${index + 1})`,
      ingredientBudget * share,
      dayIn(day),
    );
  });

  if (random() < 0.55) {
    addExpense(
      'Marketing',
      'Social media & promotions',
      randomBetween(random, 12000, 45000),
      dayIn(randomInt(random, 6, 22)),
    );
  }

  if (random() < 0.4) {
    addExpense(
      'Maintenance',
      'Kitchen equipment servicing',
      randomBetween(random, 8000, 60000),
      dayIn(randomInt(random, 8, 26)),
    );
  }

  return expenses;
}

async function insertInChunks(Model, docs, label) {
  for (let i = 0; i < docs.length; i += INSERT_CHUNK_SIZE) {
    const chunk = docs.slice(i, i + INSERT_CHUNK_SIZE);
    await Model.insertMany(chunk, { ordered: false });
    process.stdout.write(
      `\r  ${label}: ${Math.min(i + chunk.length, docs.length)}/${docs.length}`,
    );
  }
  process.stdout.write('\n');
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  await connectDatabase();

  const { shop, branch, user } = await resolveTarget(args);
  const shopId = shop.shopId;
  const branchId = branch.branchId;

  console.log(
    `Seeding ${args.months} months for shop ${shopId} (${shop.shopName}) branch ${branchId}`,
  );
  console.log(`  owner: ${user.name} (${user._id})`);
  console.log(`  random seed: ${args.seed}`);

  if (args.reset) {
    await resetSeededData(shopId, branchId);
  } else {
    const existing = await History.countDocuments({ shopId, branchId });
    if (existing > 0) {
      throw new Error(
        `${existing} sales records already exist. Re-run with --reset to regenerate.`,
      );
    }
  }

  const random = createRandom(args.seed);
  const { catalog, costCategoryDocs } = await seedCatalog(shopId, branchId, user);
  const costCategoryByName = new Map(costCategoryDocs.map((doc) => [doc.name, doc]));

  const context = {
    random,
    catalog,
    costCategoryByName,
    shopId,
    branchId,
    user,
    counters: { cartNumber: 0, orderNumber: 0, expenseNumber: 0 },
  };

  const windows = buildMonthWindows(args.months, new Date());
  const allOrders = [];
  const allExpenses = [];
  const monthlySummary = [];

  for (const window of windows) {
    const orders = generateSalesForMonth(window, context);
    const monthlySales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const expenses = generateCostsForMonth(window, monthlySales, context);
    const monthlyCosts = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    allOrders.push(...orders);
    allExpenses.push(...expenses);
    monthlySummary.push({
      month: `${window.start.getFullYear()}-${String(window.start.getMonth() + 1).padStart(2, '0')}`,
      orders: orders.length,
      sales: Math.round(monthlySales),
      costs: Math.round(monthlyCosts),
      partial: window.isCurrentMonth,
    });
  }

  await insertInChunks(History, allOrders, 'sales');
  await insertInChunks(CostExpense, allExpenses, 'expenses');

  console.log('\nMonthly summary:');
  for (const row of monthlySummary) {
    console.log(
      `  ${row.month}  orders=${String(row.orders).padStart(4)}  sales=${String(row.sales).padStart(9)}  costs=${String(row.costs).padStart(8)}  profit=${String(row.sales - row.costs).padStart(9)}${row.partial ? '  (partial month)' : ''}`,
    );
  }

  console.log(
    `\nDone. ${allOrders.length} sales records and ${allExpenses.length} expenses inserted.`,
  );

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
