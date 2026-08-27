require('dotenv').config();

const mongoose = require('mongoose');
const { connectDatabase } = require('../../../config/database');

const ShopsData = require('../../../models/shopsData');
const Branch = require('../../../models/branch');
const User = require('../../../models/user');
const Product = require('../../../models/product');
const History = require('../../../models/history');

const DEFAULT_SHOP_ID = 'SI000001';
const DEFAULT_BRANCH_ID = 'B00001';
const DEFAULT_SEED = 20260827;
const DEFAULT_ORDERS = 12000;
const DEFAULT_DAYS = 180;
const INSERT_CHUNK_SIZE = 1000;
const DRY_RUN_SAMPLES = 5;

/**
 * Every seeded row carries BOTH tags, and --clean only deletes rows that match
 * BOTH at once. A real order would have to fake the operator name AND the
 * orderId prefix to be caught, so the cleanup can never touch live sales.
 */
const SEED_ORDER_ID_PREFIX = 'RS';
const SEED_ORDER_ID_REGEX = '^RS[0-9]{6,}$';
const SEED_USER_NAME = 'Recommendation Seed Bot';

const PAYMENT_OPTIONS = ['cash', 'card', 'online'];
const ORDER_TYPES = ['dine_in', 'takeaway', 'delivery'];

/** Two extra items 8% of the time, one 30% — the rest of the basket is pure rule output. */
const NOISE_TWO_ITEMS_CHANCE = 0.08;
const NOISE_ONE_ITEM_CHANCE = 0.38;
const MULTI_QTY_CHANCE = 0.2;

/** Restaurant traffic is bimodal; a flat hour spread would look synthetic on the dashboard. */
const SERVICE_WINDOWS = [
  { startHour: 11, endHour: 14, weight: 55 },
  { startHour: 18, endHour: 21, weight: 45 },
];

/**
 * Menu groups are matched at runtime against the shop's own category names
 * (product name is the fallback), so no ObjectId or product name is ever
 * baked into this file. First definition that matches wins, which is why
 * kottu is tested before rice & curry — "Kottu & Fried Rice" would otherwise
 * be swallowed by the loose /rice|curry/ pattern.
 */
const GROUP_DEFINITIONS = [
  { key: 'kottu', label: 'Kottu & Fried Rice', pattern: /kottu|fried\s*rice/i },
  { key: 'riceCurry', label: 'Rice & Curry', pattern: /rice|curry/i },
  { key: 'seafood', label: 'Seafood', pattern: /sea\s*food|fish|prawn|crab|squid|cuttle/i },
  { key: 'beverage', label: 'Beverages', pattern: /beverage|drink|juice|coffee|tea|soda|water/i },
  { key: 'dessert', label: 'Desserts', pattern: /dessert|sweet|pudding|ice\s*cream|cake/i },
];

const MAIN_GROUP_KEYS = ['kottu', 'riceCurry', 'seafood'];

/** Which kind of main opens the basket. 'none' is a drinks/dessert-only walk-in. */
const ANCHOR_PLAN = [
  { key: 'kottu', weight: 45 },
  { key: 'riceCurry', weight: 34 },
  { key: 'seafood', weight: 13 },
  { key: 'none', weight: 8 },
];

/**
 * The patterns the recommender is supposed to rediscover.
 *
 * `probability` is the category-level attach rate asked for. `signatureShare`
 * is what makes those rates visible to Apriori: a category rule spread evenly
 * over 4 mains x 4 sides is 16 weak pairs, every one of them near lift 1 once
 * it is diluted by the existing random history. Sending most of each anchor's
 * attachments to ONE partner concentrates the same category rate into item
 * pairs that clear lift 1 by a wide margin, which is the level Apriori mines.
 * Signature partners are assigned by popularity rank, never by hardcoded name.
 */
const AFFINITY_RULES = [
  {
    id: 'kottu_pulls_beverage',
    label: 'Kottu / Fried Rice main pulls a beverage',
    anchorGroup: 'kottu',
    partnerGroup: 'beverage',
    probability: 0.7,
    signatureShare: 0.6,
    // Lime is held back so the grilled/devilled rule below keeps a clean signal.
    partnerPreference: ['soft drink', 'coffee', 'coconut'],
    partnerAvoid: /lime/i,
  },
  {
    id: 'rice_curry_pulls_seafood',
    label: 'Rice & Curry pulls a seafood side',
    anchorGroup: 'riceCurry',
    partnerGroup: 'seafood',
    probability: 0.45,
    signatureShare: 0.55,
  },
  {
    id: 'main_pulls_dessert',
    label: 'Any main pulls a dessert',
    anchorGroup: 'main',
    partnerGroup: 'dessert',
    probability: 0.35,
    signatureShare: 0.8,
  },
  {
    id: 'grilled_seafood_pulls_lime',
    label: 'Grilled / devilled seafood pulls fresh lime juice',
    anchorGroup: 'seafood',
    anchorNameMatch: /grill|devil/i,
    partnerGroup: 'beverage',
    partnerNameMatch: /lime/i,
    probability: 0.6,
    signatureShare: 1,
  },
];

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

function randomInt(random, min, max) {
  return Math.floor(min + random() * (max - min + 1));
}

function pickOne(random, items) {
  return items[randomInt(random, 0, items.length - 1)];
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

function money(value) {
  return Math.round(value).toLocaleString('en-LK');
}

/** Local time, not ISO/UTC — the service windows above are local shop hours. */
function formatLocalTimestamp(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function parseArgs(argv) {
  const envShopId = String(process.env.SEED_SHOP_ID || '').trim().toUpperCase();
  const envBranchId = String(process.env.SEED_BRANCH_ID || '').trim().toUpperCase();

  const args = {
    clean: false,
    cleanOnly: false,
    dryRun: false,
    help: false,
    seed: DEFAULT_SEED,
    orders: DEFAULT_ORDERS,
    days: DEFAULT_DAYS,
    shopId: envShopId || null,
    branchId: envBranchId || null,
    explicitTarget: Boolean(envShopId || envBranchId),
  };

  for (const arg of argv) {
    if (arg === '--clean') args.clean = true;
    else if (arg === '--clean-only') {
      args.clean = true;
      args.cleanOnly = true;
    } else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--orders=')) args.orders = Number(arg.split('=')[1]);
    else if (arg.startsWith('--days=')) args.days = Number(arg.split('=')[1]);
    else if (arg.startsWith('--seed=')) args.seed = Number(arg.split('=')[1]);
    else if (arg.startsWith('--shopId=')) {
      args.shopId = arg.split('=')[1].trim().toUpperCase();
      args.explicitTarget = true;
    } else if (arg.startsWith('--branchId=')) {
      args.branchId = arg.split('=')[1].trim().toUpperCase();
      args.explicitTarget = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag ${arg}. Run with --help to see the supported flags.`);
    }
  }

  if (!Number.isFinite(args.orders) || args.orders < 50) {
    throw new Error('--orders must be a number >= 50');
  }
  if (!Number.isFinite(args.days) || args.days < 7) {
    throw new Error('--days must be a number >= 7');
  }
  if (!Number.isFinite(args.seed)) {
    throw new Error('--seed must be a number');
  }

  return args;
}

function printHelp() {
  console.log(`Seed co-purchase patterns for novelty 4 (recommendation system).

  node src/novelty/novelty04RecommendationSystem/seed/seedRecommendationData.js [flags]
  npm run seed:recommendations -- [flags]

  --dry-run            print the first ${DRY_RUN_SAMPLES} baskets and the projected lift, write nothing
  --clean              delete previously seeded rows (tagged only) before seeding
  --clean-only         delete previously seeded rows and exit
  --orders=N           number of orders to generate (default ${DEFAULT_ORDERS})
  --days=N             spread checkout times over the last N days (default ${DEFAULT_DAYS})
  --seed=N             PRNG seed (default ${DEFAULT_SEED})
  --shopId=SI000001    target shop (env SEED_SHOP_ID, default ${DEFAULT_SHOP_ID})
  --branchId=B00001    target branch (env SEED_BRANCH_ID, default ${DEFAULT_BRANCH_ID})

Seeded rows are tagged submittedUserName="${SEED_USER_NAME}" and orderId "${SEED_ORDER_ID_PREFIX}######".
Nothing is ever deleted unless --clean / --clean-only is passed.`);
}

async function resolveTarget(args) {
  const wantedShopId = args.shopId || DEFAULT_SHOP_ID;
  let shop = await ShopsData.findOne({ shopId: wantedShopId }).lean();

  // Only fall back when the operator did not name a target - an explicit
  // --shopId that does not exist is a typo, not an invitation to guess.
  if (!shop && !args.explicitTarget) {
    shop = await ShopsData.findOne().lean();
  }
  if (!shop) {
    throw new Error(`Shop ${wantedShopId} not found. Complete onboarding or pass --shopId=.`);
  }

  const wantedBranchId = args.branchId || DEFAULT_BRANCH_ID;
  let branch = await Branch.findOne({ shopId: shop.shopId, branchId: wantedBranchId }).lean();
  if (!branch && !args.explicitTarget) {
    branch = await Branch.findOne({ shopId: shop.shopId }).lean();
  }
  if (!branch) {
    throw new Error(`Branch ${wantedBranchId} not found for shop ${shop.shopId}.`);
  }

  const user =
    (await User.findOne({ shopId: shop.shopId, role: 'owner' }).lean()) ||
    (await User.findOne({ shopId: shop.shopId }).lean());

  if (!user) {
    throw new Error(`No user found for shop ${shop.shopId}.`);
  }

  return { shop, branch, user };
}

function seededRecordFilter(shopId, branchId) {
  return {
    shopId,
    branchId,
    submittedUserName: SEED_USER_NAME,
    orderId: { $regex: SEED_ORDER_ID_REGEX },
  };
}

function classifyProduct(product) {
  for (const definition of GROUP_DEFINITIONS) {
    if (definition.pattern.test(product.categoryName)) return definition.key;
  }
  for (const definition of GROUP_DEFINITIONS) {
    if (definition.pattern.test(product.productName)) return definition.key;
  }
  return 'other';
}

/**
 * Anchor weights come from what the branch has ACTUALLY sold, so the planted
 * rules ride on top of the shop's real popularity curve instead of flattening
 * it. A catalog with no sales yet falls back to equal weights.
 */
async function loadCatalog(shopId, branchId) {
  const [products, soldRows] = await Promise.all([
    Product.find({ shopId, type: 'product' })
      .select('productName categoryId categoryName amount cost')
      .lean(),
    History.aggregate([
      { $match: { shopId, branchId, status: 'submited' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId', qty: { $sum: '$items.qty' } } },
    ]),
  ]);

  const soldByProduct = new Map(soldRows.map((row) => [String(row._id), row.qty]));

  const catalog = products
    .filter((product) => Number(product.amount) > 0)
    .map((product) => ({
      _id: product._id,
      productId: String(product._id),
      productName: product.productName,
      categoryName: product.categoryName || '',
      price: Number(product.amount),
      cost: Number.isFinite(Number(product.cost)) ? Number(product.cost) : null,
      weight: Math.max(1, soldByProduct.get(String(product._id)) || 0),
    }));

  if (!catalog.length) {
    throw new Error(
      `No priced products found for shop ${shopId}. Seed the catalog first:\n` +
        '  npm run seed:forecast -- --reset',
    );
  }

  const groups = { other: [] };
  for (const definition of GROUP_DEFINITIONS) groups[definition.key] = [];

  for (const product of catalog) {
    groups[classifyProduct(product)].push(product);
  }

  // Popularity order makes the signature assignment below deterministic and
  // sensible: the best selling anchor claims the best selling partner.
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => b.weight - a.weight || a.productName.localeCompare(b.productName));
  }

  groups.main = MAIN_GROUP_KEYS.flatMap((key) => groups[key]).sort(
    (a, b) => b.weight - a.weight || a.productName.localeCompare(b.productName),
  );

  return { catalog, groups };
}

function selectPool(groups, groupKey, nameMatch, nameAvoid) {
  let pool = groups[groupKey] || [];
  if (nameMatch) pool = pool.filter((product) => nameMatch.test(product.productName));
  if (nameAvoid) pool = pool.filter((product) => !nameAvoid.test(product.productName));
  return pool;
}

function buildSignatureMap(anchors, partners, rule) {
  const preferred = (rule.partnerPreference || [])
    .map((fragment) =>
      partners.find((product) => product.productName.toLowerCase().includes(fragment)),
    )
    .filter(Boolean);

  const pool = preferred.length ? preferred : partners;
  const signature = new Map();

  anchors.forEach((anchor, index) => {
    signature.set(anchor.productId, pool[index % pool.length]);
  });

  return signature;
}

function resolveRules(groups) {
  const resolved = [];
  const skipped = [];

  for (const rule of AFFINITY_RULES) {
    const anchors = selectPool(groups, rule.anchorGroup, rule.anchorNameMatch);
    const partners = selectPool(
      groups,
      rule.partnerGroup,
      rule.partnerNameMatch,
      rule.partnerAvoid,
    );

    // A shop without the products a rule needs simply does not get that rule.
    if (!anchors.length || !partners.length) {
      skipped.push({
        rule,
        reason: !anchors.length ? 'no matching anchor products' : 'no matching partner products',
      });
      continue;
    }

    resolved.push({
      ...rule,
      anchors,
      partners,
      anchorIds: new Set(anchors.map((product) => product.productId)),
      signature: buildSignatureMap(anchors, partners, rule),
    });
  }

  return { resolved, skipped };
}

function buildAnchorPlan(groups) {
  const plan = ANCHOR_PLAN.filter((entry) => entry.key === 'none' || groups[entry.key].length);
  if (!plan.some((entry) => entry.key !== 'none')) {
    throw new Error('No main-course products were recognised in this catalog.');
  }
  return plan;
}

function pickCheckOutTime(random, now, spreadDays) {
  // Never "today": the other novelties treat the current day as partial.
  const dayOffset = randomInt(random, 1, spreadDays);
  const date = new Date(now.getTime());
  date.setDate(date.getDate() - dayOffset);

  const window = pickWeighted(random, SERVICE_WINDOWS);
  date.setHours(
    randomInt(random, window.startHour, window.endHour),
    randomInt(random, 0, 59),
    randomInt(random, 0, 59),
    0,
  );

  return date;
}

function buildBasket(random, plan) {
  const { groups, rules, anchorPlan, catalog } = plan;
  const chosen = new Map();

  const anchorGroupKey = pickWeighted(random, anchorPlan).key;
  if (anchorGroupKey !== 'none') {
    const anchor = pickWeighted(random, groups[anchorGroupKey]);
    chosen.set(anchor.productId, anchor);
  }

  for (const rule of rules) {
    const present = [...chosen.values()].filter((product) => rule.anchorIds.has(product.productId));
    if (!present.length) continue;
    if (random() > rule.probability) continue;

    const anchor = present.length === 1 ? present[0] : pickOne(random, present);
    const partner =
      random() < rule.signatureShare
        ? rule.signature.get(anchor.productId)
        : pickWeighted(random, rule.partners);

    if (partner && !chosen.has(partner.productId)) {
      chosen.set(partner.productId, partner);
    }
  }

  // Noise stops the corpus collapsing into four deterministic templates. With
  // perfectly clean baskets every rule would hit confidence 1.0 and the model
  // would have nothing to rank.
  const noiseRoll = random();
  const extras = noiseRoll < NOISE_TWO_ITEMS_CHANCE ? 2 : noiseRoll < NOISE_ONE_ITEM_CHANCE ? 1 : 0;
  for (let i = 0; i < extras; i += 1) {
    const extra = pickWeighted(random, catalog);
    if (!chosen.has(extra.productId)) chosen.set(extra.productId, extra);
  }

  if (!chosen.size) {
    const fallback = pickWeighted(random, catalog);
    chosen.set(fallback.productId, fallback);
  }

  return [...chosen.values()].map((product) => ({
    product,
    qty: random() < MULTI_QTY_CHANCE ? 2 : 1,
  }));
}

function buildHistoryDocument(basket, context) {
  const { random, shopId, branchId, user, counters, now, spreadDays } = context;

  const items = basket.map((line) => ({
    productId: line.product._id,
    productName: line.product.productName,
    qty: line.qty,
    unitCost: line.product.cost,
  }));

  const total = basket.reduce((sum, line) => sum + line.product.price * line.qty, 0);
  const checkOutTime = pickCheckOutTime(random, now, spreadDays);

  counters.cartNumber += 1;

  return {
    shopId,
    branchId,
    cartId: new mongoose.Types.ObjectId(),
    cartNumber: counters.cartNumber,
    orderId: `${SEED_ORDER_ID_PREFIX}${String(counters.cartNumber).padStart(6, '0')}`,
    checkOutTime,
    amount: total,
    isDiscount: false,
    discountedAmount: 0,
    taxAmount: 0,
    serviceChargeAmount: 0,
    items,
    totalAmount: total,
    customerName: '',
    customerMobile: '',
    userId: user._id,
    submittedUserId: user._id,
    submittedUserName: SEED_USER_NAME,
    paymentOption: pickOne(random, PAYMENT_OPTIONS),
    status: 'submited',
    orderType: pickOne(random, ORDER_TYPES),
    createdAt: checkOutTime,
    updatedAt: checkOutTime,
  };
}

/** The pairs printed in the summary: each rule's top anchor and its signature partner. */
function buildHighlightPairs(rules) {
  return rules
    .map((rule) => {
      const anchor = rule.anchors[0];
      if (!anchor) return null;

      const partner = rule.signature.get(anchor.productId);
      if (!partner || anchor.productId === partner.productId) return null;
      return { ruleId: rule.id, ruleLabel: rule.label, anchor, partner };
    })
    .filter(Boolean);
}

function summarizePair(total, anchorCount, partnerCount, bothCount) {
  const support = total ? bothCount / total : 0;
  const confidence = anchorCount ? bothCount / anchorCount : 0;
  const partnerRate = total ? partnerCount / total : 0;
  return {
    total,
    anchorCount,
    partnerCount,
    bothCount,
    support,
    confidence,
    lift: partnerRate ? confidence / partnerRate : 0,
  };
}

/** Counted straight out of Mongo so the printed lift is measured, not predicted. */
async function measurePair(shopId, branchId, pair) {
  const base = { shopId, branchId, status: 'submited' };
  const [total, anchorCount, partnerCount, bothCount] = await Promise.all([
    History.countDocuments(base),
    History.countDocuments({ ...base, 'items.productId': pair.anchor._id }),
    History.countDocuments({ ...base, 'items.productId': pair.partner._id }),
    History.countDocuments({
      ...base,
      'items.productId': { $all: [pair.anchor._id, pair.partner._id] },
    }),
  ]);

  return summarizePair(total, anchorCount, partnerCount, bothCount);
}

function countPairInBaskets(documents, pair) {
  let anchorCount = 0;
  let partnerCount = 0;
  let bothCount = 0;

  for (const document of documents) {
    const ids = new Set(document.items.map((item) => String(item.productId)));
    const hasAnchor = ids.has(pair.anchor.productId);
    const hasPartner = ids.has(pair.partner.productId);
    if (hasAnchor) anchorCount += 1;
    if (hasPartner) partnerCount += 1;
    if (hasAnchor && hasPartner) bothCount += 1;
  }

  return { total: documents.length, anchorCount, partnerCount, bothCount };
}

function formatPairStats(stats) {
  return `lift ${stats.lift.toFixed(2)}  support ${stats.bothCount} baskets (${percent(stats.support)})  confidence ${percent(stats.confidence)}`;
}

async function insertInChunks(documents) {
  for (let i = 0; i < documents.length; i += INSERT_CHUNK_SIZE) {
    const chunk = documents.slice(i, i + INSERT_CHUNK_SIZE);
    await History.insertMany(chunk, { ordered: false });
    process.stdout.write(
      `\r  inserting: ${Math.min(i + chunk.length, documents.length)}/${documents.length}`,
    );
  }
  if (documents.length) process.stdout.write('\n');
}

async function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return;
  }

  await connectDatabase();

  const { shop, branch, user } = await resolveTarget(args);
  const shopId = shop.shopId;
  const branchId = branch.branchId;

  console.log(
    `Seeding co-purchase patterns for shop ${shopId} (${shop.shopName}) branch ${branchId}`,
  );
  console.log(`  operator tag: ${SEED_USER_NAME} / orderId ${SEED_ORDER_ID_PREFIX}######`);
  console.log(`  random seed: ${args.seed}`);

  const existingSeeded = await History.countDocuments(seededRecordFilter(shopId, branchId));

  if (args.clean) {
    if (args.dryRun) {
      console.log(`\n  --dry-run: would delete ${existingSeeded} previously seeded orders.`);
    } else {
      const result = await History.deleteMany(seededRecordFilter(shopId, branchId));
      console.log(`  cleaned: ${result.deletedCount} previously seeded orders removed`);
    }
    if (args.cleanOnly) {
      console.log('\nDone. Nothing was seeded (--clean-only).');
      await mongoose.disconnect();
      return;
    }
  } else if (existingSeeded > 0 && !args.dryRun) {
    throw new Error(
      `${existingSeeded} orders from a previous run of this seed already exist. ` +
        'Re-run with --clean to replace them (real sales are never touched).',
    );
  } else if (existingSeeded > 0) {
    console.log(`  note: ${existingSeeded} orders from a previous run are already present`);
  }

  const { catalog, groups } = await loadCatalog(shopId, branchId);
  const { resolved, skipped } = resolveRules(groups);
  const anchorPlan = buildAnchorPlan(groups);

  console.log(`\nCatalog: ${catalog.length} priced products`);
  for (const definition of GROUP_DEFINITIONS) {
    const names = groups[definition.key].map((product) => product.productName);
    console.log(`  ${definition.label.padEnd(20)} ${names.length ? names.join(', ') : '(none)'}`);
  }

  console.log('\nAffinity rules resolved against this catalog:');
  for (const rule of resolved) {
    const example = rule.anchors[0];
    console.log(
      `  ${rule.label} @ ${percent(rule.probability)}  ` +
        `[${rule.anchors.length} anchors -> ${rule.partners.length} partners, ` +
        `e.g. ${example.productName} -> ${rule.signature.get(example.productId).productName}]`,
    );
  }
  for (const entry of skipped) {
    console.log(`  SKIPPED ${entry.rule.label} (${entry.reason})`);
  }

  const highlightPairs = buildHighlightPairs(resolved);
  const beforeStats = new Map();
  for (const pair of highlightPairs) {
    beforeStats.set(pair.ruleId, await measurePair(shopId, branchId, pair));
  }

  const lastOrder = await History.findOne({ shopId, branchId })
    .sort({ cartNumber: -1 })
    .select('cartNumber')
    .lean();
  const startCartNumber = Math.max(0, Number(lastOrder?.cartNumber) || 0);

  const random = createRandom(args.seed);
  const context = {
    random,
    shopId,
    branchId,
    user,
    now: new Date(),
    spreadDays: args.days,
    counters: { cartNumber: startCartNumber },
  };
  const plan = { groups, rules: resolved, anchorPlan, catalog };

  const documents = [];
  for (let i = 0; i < args.orders; i += 1) {
    documents.push(buildHistoryDocument(buildBasket(random, plan), context));
  }

  console.log(
    `\nGenerated ${documents.length} baskets over the last ${args.days} days ` +
      `(cart numbers ${startCartNumber + 1}-${context.counters.cartNumber})`,
  );

  if (args.dryRun) {
    console.log(`\nFirst ${DRY_RUN_SAMPLES} baskets that WOULD be created:`);
    for (const document of documents.slice(0, DRY_RUN_SAMPLES)) {
      const when = formatLocalTimestamp(document.checkOutTime);
      const lines = document.items
        .map((item) => `${item.productName} x${item.qty}`)
        .join('  +  ');
      console.log(`  ${document.orderId}  ${when}  Rs. ${money(document.totalAmount)}`);
      console.log(`      ${lines}`);
    }

    console.log('\nProjected lift (Mongo counts today + the baskets above, nothing written):');
    for (const pair of highlightPairs) {
      const before = beforeStats.get(pair.ruleId);
      const generated = countPairInBaskets(documents, pair);
      const after = summarizePair(
        before.total + generated.total,
        before.anchorCount + generated.anchorCount,
        before.partnerCount + generated.partnerCount,
        before.bothCount + generated.bothCount,
      );
      console.log(`  ${pair.anchor.productName} -> ${pair.partner.productName}`);
      console.log(
        `      now   lift ${before.lift.toFixed(2)}  support ${before.bothCount} baskets`,
      );
      console.log(`      after ${formatPairStats(after)}`);
    }

    console.log('\nDry run complete. No records were written.');
    await mongoose.disconnect();
    return;
  }

  await insertInChunks(documents);

  console.log('\nSummary:');
  console.log(`  orders inserted: ${documents.length}`);
  console.log(
    `  orderId range: ${documents[0].orderId} - ${documents[documents.length - 1].orderId}`,
  );
  console.log(
    `  total submitted orders now: ${await History.countDocuments({ shopId, branchId, status: 'submited' })}`,
  );

  console.log('\nPlanted pair lift, measured directly from Mongo:');
  for (const pair of highlightPairs) {
    const before = beforeStats.get(pair.ruleId);
    const after = await measurePair(shopId, branchId, pair);
    console.log(`  ${pair.anchor.productName} -> ${pair.partner.productName}  (${pair.ruleLabel})`);
    console.log(`      before  lift ${before.lift.toFixed(2)}`);
    console.log(`      after   ${formatPairStats(after)}`);
  }

  console.log(
    `\nDone. Re-run with --clean to replace these ${documents.length} orders, ` +
      'or --clean-only to remove them.',
  );

  await mongoose.disconnect();
}

// Requiring this file must never touch the database - only running it directly seeds.
if (require.main === module) {
  run().catch(async (error) => {
    console.error('Seed failed:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
}

module.exports = {
  run,
  parseArgs,
  buildBasket,
  buildHistoryDocument,
  resolveRules,
  loadCatalog,
  seededRecordFilter,
  summarizePair,
  SEED_USER_NAME,
  SEED_ORDER_ID_PREFIX,
  AFFINITY_RULES,
};
