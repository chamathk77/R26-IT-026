const mongoose = require('mongoose');

const ENV_DATABASE_NAMES = {
  DEV: 'smartCostDev',
  LIVE: 'smartCostLive',
};

function resolveAppEnvironment() {
  const env = String(process.env.ENV || 'DEV').trim().toUpperCase();
  const dbName = ENV_DATABASE_NAMES[env];

  if (!dbName) {
    throw new Error(`ENV must be DEV or LIVE (received: "${process.env.ENV}")`);
  }

  const overrideDbName = String(process.env.MONGODB_DB_NAME || '').trim();

  return { env, dbName: overrideDbName || dbName };
}

function replaceMongoDatabase(uri, dbName) {
  const trimmedUri = uri.trim();
  const questionIndex = trimmedUri.indexOf('?');
  const base = questionIndex >= 0 ? trimmedUri.slice(0, questionIndex) : trimmedUri;
  const query = questionIndex >= 0 ? trimmedUri.slice(questionIndex) : '';

  const protocolSep = base.indexOf('://');
  if (protocolSep === -1) {
    throw new Error('Invalid MONGODB_URI format');
  }

  const afterProtocol = base.slice(protocolSep + 3);
  const slashIndex = afterProtocol.indexOf('/');

  if (slashIndex === -1) {
    return `${base}/${dbName}${query}`;
  }

  const withoutDb = base.slice(0, protocolSep + 3 + slashIndex);
  return `${withoutDb}/${dbName}${query}`;
}

function buildMongoUri() {
  const baseUri = process.env.MONGODB_URI;
  if (!baseUri || !baseUri.trim()) {
    throw new Error('MONGODB_URI is not set. Add it to your .env file.');
  }

  const { env, dbName } = resolveAppEnvironment();
  const uri = replaceMongoDatabase(baseUri, dbName);

  return { uri, env, dbName };
}

async function connectDatabase() {
  const { uri, env, dbName } = buildMongoUri();

  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri);
  } catch (err) {
    if (err.message && err.message.includes('querySrv')) {
      console.error(
        'DNS SRV lookup failed. In Atlas: use the standard mongodb:// connection string, or fix DNS/firewall.',
      );
    }
    throw err;
  }

  console.log(
    `MongoDB connected (ENV=${env}, database: ${mongoose.connection.db.databaseName}, expected: ${dbName})`,
  );

  const Product = require('../models/product');
  try {
    await Product.collection.dropIndex('shopId_1_barcode_1');
    console.log('Dropped legacy product barcode index (shopId_1_barcode_1)');
  } catch (_) {
    // Index may not exist or already replaced.
  }
  await Product.syncIndexes();
}

module.exports = {
  connectDatabase,
  buildMongoUri,
  resolveAppEnvironment,
};
