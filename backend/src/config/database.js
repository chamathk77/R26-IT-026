const mongoose = require('mongoose');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.trim()) {
    throw new Error('MONGODB_URI is not set. Add it to your .env file.');
  }

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
  console.log(`MongoDB connected (database: ${mongoose.connection.db.databaseName})`);

  const Product = require('../models/product');
  try {
    await Product.collection.dropIndex('shopId_1_barcode_1');
    console.log('Dropped legacy product barcode index (shopId_1_barcode_1)');
  } catch (_) {
    // Index may not exist or already replaced.
  }
  await Product.syncIndexes();
}

module.exports = { connectDatabase };
