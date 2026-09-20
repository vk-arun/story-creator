const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

/**
 * Global cache across serverless function invocations (Vercel / AWS Lambda)
 * and hot reload cycles in local development.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return null;
  }

  // Reuse existing live connection if available
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      serverSelectionTimeoutMS: 10000,
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log(`✅ MongoDB Connected: ${m.connection.host}`);
      cached.conn = m;
      return m;
    }).catch((err) => {
      cached.promise = null;
      cached.conn = null;
      console.error(`❌ MongoDB Connection error: ${err.message}`);
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    cached.conn = null;
    throw err;
  }
};

const getIsConnected = () => {
  return !!(mongoose.connection && mongoose.connection.readyState === 1);
};

module.exports = { connectDB, getIsConnected };

