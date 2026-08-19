require('dotenv').config();

const mongoose = require('mongoose');
const { connectDatabase } = require('../../../config/database');
const { buildPastOrderSnapshot } = require('../../../controllers/customerController');

const ShopsData = require('../../../models/shopsData');
const Branch = require('../../../models/branch');
const User = require('../../../models/user');
const History = require('../../../models/history');
const Customer = require('../../../models/customer');

const DEFAULT_SEED = 20260818;
const DEFAULT_CUSTOMER_COUNT = 180;
const IDENTIFIED_ORDER_SHARE = 0.65;
const BULK_CHUNK = 1000;
const POINTS_PER_ORDER = 10;

const FIRST_NAMES = [
  'Nimal',
  'Sanduni',
  'Kasun',
  'Tharindu',
  'Ishara',
  'Dilshan',
  'Malithi',
  'Ruwan',
  'Ayesh',
  'Priyanka',
  'Chaminda',
  'Nadeesha',
  'Supun',
  'Harsha',
  'Kavindi',
  'Mahesh',
  'Dinesh',
  'Sachini',
  'Ravindu',
  'Anjali',
];

const LAST_NAMES = [
  'Perera',
  'Silva',
  'Fernando',
  'Jayawardena',
  'Wickramasinghe',
  'Ratnayake',
  'Bandara',
  'Gunasekara',
  'Karunaratne',
  'Mendis',
  'Weerasinghe',
  'Dissanayake',
  'Herath',
  'Amarasinghe',
  'Ekanayake',
];

const HABITS = ['weekday_lunch', 'weekend_dinner', 'kottu_fan', 'general'];

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

function randomInt(random, min, max) {
  return Math.floor(min + random() * (max - min + 1));
}

function pickOne(random, items) {
  return items[randomInt(random, 0, items.length - 1)];
}

function roundMoney(value) {
  return Number(Math.max(0, value).toFixed(2));
}

function parseArgs(argv) {
  const args = {
    reset: false,
    seed: DEFAULT_SEED,
    customers: DEFAULT_CUSTOMER_COUNT,
  };

  for (const arg of argv) {
    if (arg === '--reset') args.reset = true;
    else if (arg.startsWith('--seed=')) args.seed = Number(arg.split('=')[1]);
    else if (arg.startsWith('--customers=')) args.customers = Number(arg.split('=')[1]);
    else if (arg.startsWith('--shopId=')) args.shopId = arg.split('=')[1].trim().toUpperCase();
    else if (arg.startsWith('--branchId=')) args.branchId = arg.split('=')[1].trim().toUpperCase();
  }

  if (!Number.isFinite(args.customers) || args.customers < 10) {
    throw new Error('--customers must be a number >= 10');
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

function generateCustomerPool(random, count) {
  const usedMobiles = new Set();
  const customers = [];

  for (let i = 0; i < count; i += 1) {
    let mobile;
    do {
      mobile = `07${String(randomInt(random, 10000000, 99999999))}`;
    } while (usedMobiles.has(mobile));
    usedMobiles.add(mobile);

    const tierRoll = random();
    let tier;
    let selectionWeight;
    if (tierRoll < 0.18) {
      tier = 'vip';
      selectionWeight = 8;
    } else if (tierRoll < 0.55) {
      tier = 'regular';
      selectionWeight = 3;
    } else {
      tier = 'occasional';
      selectionWeight = 1;
    }

    customers.push({
      mobileNumber: mobile,
      name: `${pickOne(random, FIRST_NAMES)} ${pickOne(random, LAST_NAMES)}`,
      tier,
      habit: pickOne(random, HABITS),
      selectionWeight,
    });
  }

  return customers;
}

function orderMatchesHabit(order, habit) {
  const day = new Date(order.checkOutTime).getDay();
  const hour = new Date(order.checkOutTime).getHours();
  const productNames = (order.items ?? []).map((item) => String(item.productName ?? '').toLowerCase());

  if (habit === 'weekday_lunch') {
    const weekday = day >= 1 && day <= 5;
    const lunch = hour >= 10 && hour <= 14;
    const menuMatch = productNames.some(
      (name) =>
        name.includes('rice') ||
        name.includes('curry') ||
        name.includes('juice') ||
        name.includes('coffee') ||
        name.includes('coconut'),
    );
    return weekday && lunch && menuMatch;
  }

  if (habit === 'weekend_dinner') {
    const weekend = day === 0 || day === 6;
    const dinner = hour >= 17 && hour <= 21;
    const menuMatch = productNames.some(
      (name) =>
        name.includes('seafood') ||
        name.includes('prawn') ||
        name.includes('fish') ||
        name.includes('crab') ||
        name.includes('watalappan') ||
        name.includes('pudding') ||
        name.includes('curd'),
    );
    return weekend && dinner && menuMatch;
  }

  if (habit === 'kottu_fan') {
    return productNames.some((name) => name.includes('kottu') || name.includes('fried rice'));
  }

  return true;
}

function pickCustomerForOrder(random, customers, order) {
  const scored = customers.map((customer) => {
    let score = customer.selectionWeight;
    if (orderMatchesHabit(order, customer.habit)) {
      score *= 4;
    }
    return { customer, score };
  });

  const totalScore = scored.reduce((sum, row) => sum + row.score, 0);
  let threshold = random() * totalScore;

  for (const row of scored) {
    threshold -= row.score;
    if (threshold <= 0) {
      return row.customer;
    }
  }

  return scored[scored.length - 1].customer;
}

async function resetCustomerData(shopId, branchId) {
  const customerResult = await Customer.deleteMany({ shopId });
  const historyResult = await History.updateMany(
    { shopId, branchId },
    { $set: { customerName: '', customerMobile: '' } },
  );

  console.log(
    `  cleared: ${customerResult.deletedCount} customers, reset customer fields on ${historyResult.modifiedCount} orders`,
  );
}

async function applyBulkUpdates(updates) {
  for (let i = 0; i < updates.length; i += BULK_CHUNK) {
    const chunk = updates.slice(i, i + BULK_CHUNK);
    await History.bulkWrite(chunk, { ordered: false });
    process.stdout.write(`\r  history updates: ${Math.min(i + chunk.length, updates.length)}/${updates.length}`);
  }
  if (updates.length) {
    process.stdout.write('\n');
  }
}

function buildCustomerDocument(shopId, profile, orders) {
  orders.sort((a, b) => new Date(a.checkOutTime) - new Date(b.checkOutTime));

  const pastOrders = [];
  let totalSales = 0;

  for (const order of orders) {
    const snapshot = buildPastOrderSnapshot(order);
    if (snapshot.error) {
      throw new Error(snapshot.error);
    }
    pastOrders.push(snapshot.pastOrder);
    totalSales += order.totalAmount;
  }

  const lastOrder = orders[orders.length - 1];

  return {
    shopId,
    mobileNumber: profile.mobileNumber,
    name: profile.name,
    totalSales: roundMoney(totalSales),
    totalOrders: orders.length,
    points: orders.length * POINTS_PER_ORDER,
    lastUpdate: lastOrder.checkOutTime,
    pastOrders,
  };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  await connectDatabase();

  const { shop, branch } = await resolveTarget(args);
  const shopId = shop.shopId;
  const branchId = branch.branchId;
  const random = createRandom(args.seed);

  console.log(
    `Seeding customer behavior data for shop ${shopId} (${shop.shopName}) branch ${branchId}`,
  );
  console.log(`  random seed: ${args.seed}`);
  console.log(`  target customers: ${args.customers}`);
  console.log(`  identified order share: ${Math.round(IDENTIFIED_ORDER_SHARE * 100)}%`);

  if (args.reset) {
    await resetCustomerData(shopId, branchId);
  } else {
    const existingCustomers = await Customer.countDocuments({ shopId });
    const linkedOrders = await History.countDocuments({
      shopId,
      branchId,
      status: 'submited',
      customerMobile: { $nin: ['', null] },
    });

    if (existingCustomers > 0 || linkedOrders > 0) {
      throw new Error(
        `Found ${existingCustomers} customers and ${linkedOrders} linked orders. Re-run with --reset to regenerate.`,
      );
    }
  }

  const orders = await History.find({ shopId, branchId, status: 'submited' })
    .sort({ checkOutTime: 1 })
    .lean();

  if (!orders.length) {
    throw new Error(
      'No submitted sales history found. Run novelty 1 seed first:\n' +
        '  node src/novelty/novelty01Forecasting/seed/seedForecastData.js --reset --months=30',
    );
  }

  const customerPool = generateCustomerPool(random, args.customers);
  const assignments = new Map();
  const historyUpdates = [];

  let linkedCount = 0;

  for (const order of orders) {
    if (random() > IDENTIFIED_ORDER_SHARE) {
      continue;
    }

    const profile = pickCustomerForOrder(random, customerPool, order);
    linkedCount += 1;

    historyUpdates.push({
      updateOne: {
        filter: { _id: order._id },
        update: {
          $set: {
            customerName: profile.name,
            customerMobile: profile.mobileNumber,
          },
        },
      },
    });

    if (!assignments.has(profile.mobileNumber)) {
      assignments.set(profile.mobileNumber, { profile, orders: [] });
    }

    assignments.get(profile.mobileNumber).orders.push({
      ...order,
      customerName: profile.name,
      customerMobile: profile.mobileNumber,
    });
  }

  console.log(`  linking ${linkedCount} of ${orders.length} orders to customers...`);
  await applyBulkUpdates(historyUpdates);

  const customerDocs = [];
  for (const { profile, orders: customerOrders } of assignments.values()) {
    customerDocs.push(buildCustomerDocument(shopId, profile, customerOrders));
  }

  if (customerDocs.length) {
    await Customer.insertMany(customerDocs, { ordered: false });
  }

  const tierCounts = { vip: 0, regular: 0, occasional: 0 };
  for (const doc of customerDocs) {
    const profile = customerPool.find((row) => row.mobileNumber === doc.mobileNumber);
    if (profile) {
      tierCounts[profile.tier] += 1;
    }
  }

  const totalLinkedRevenue = customerDocs.reduce((sum, doc) => sum + doc.totalSales, 0);
  const topSpenders = [...customerDocs]
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);

  console.log('\nSummary:');
  console.log(`  customers created: ${customerDocs.length}`);
  console.log(`  orders with customer mobile: ${linkedCount} (${((linkedCount / orders.length) * 100).toFixed(1)}%)`);
  console.log(`  walk-in / anonymous orders: ${orders.length - linkedCount}`);
  console.log(`  linked revenue: Rs. ${Math.round(totalLinkedRevenue).toLocaleString('en-LK')}`);
  console.log(
    `  tiers in pool: vip=${tierCounts.vip}, regular=${tierCounts.regular}, occasional=${tierCounts.occasional}`,
  );

  console.log('\nTop 5 customers by spend:');
  for (const customer of topSpenders) {
    console.log(
      `  ${customer.name} (${customer.mobileNumber}) — ${customer.totalOrders} orders, Rs. ${Math.round(customer.totalSales).toLocaleString('en-LK')}`,
    );
  }

  console.log('\nDone. Customer data is ready for novelty 2 behavior analysis.');
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
