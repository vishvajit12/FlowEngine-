const mongoose = require('mongoose');
const config = require('./env');

async function connectDB() {
  try {
    // Explicit short timeout -- Mongoose's default server-selection
    // timeout is ~30s, which makes "fail fast" not actually fast. This
    // is what makes the env-validation philosophy from Phase 1 (fail
    // loud, fail immediately) actually true for the DB connection too.
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
