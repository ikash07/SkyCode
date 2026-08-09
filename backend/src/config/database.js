import mongoose from 'mongoose';
import dns from 'node:dns';
import { env } from './env.js';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore if not supported
}

let isConnecting = false;
let retryTimer = null;

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1 || isConnecting) {
    return;
  }

  isConnecting = true;
  mongoose.set('strictQuery', true);

  mongoose.connection.removeAllListeners('connected');
  mongoose.connection.removeAllListeners('error');
  mongoose.connection.removeAllListeners('disconnected');

  mongoose.connection.on('connected', () => {
    isConnecting = false;
    process.stdout.write(`✅ MongoDB connected successfully!\n`);
  });

  mongoose.connection.on('error', (err) => {
    process.stderr.write(`❌ MongoDB error: ${err.message}\n`);
  });

  mongoose.connection.on('disconnected', () => {
    isConnecting = false;
    process.stdout.write('⚠️  MongoDB disconnected. Will retry connection...\n');
    scheduleRetry();
  });

  // Attempt 1: Connect to Primary MONGODB_URI (e.g. Atlas)
  try {
    process.stdout.write(`Connecting to primary MongoDB cluster...\n`);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    return;
  } catch (primaryError) {
    const err = primaryError instanceof Error ? primaryError : new Error(String(primaryError));
    process.stderr.write(`⚠️ Primary MongoDB connection failed (${err.message}). Trying local MongoDB...\n`);
  }

  // Attempt 2: Connect to Local MongoDB instance
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/online_ide', {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    process.stdout.write(`✅ Connected to local MongoDB!\n`);
    return;
  } catch {
    isConnecting = false;
    process.stderr.write(
      `\n❌ Could not connect to MongoDB Atlas or local MongoDB!\n` +
      `   💡 TO FIX THIS:\n` +
      `      1. Open MongoDB Atlas (https://cloud.mongodb.com)\n` +
      `      2. Go to Network Access -> Add IP Address -> Allow Access from Anywhere (0.0.0.0/0)\n` +
      `      3. Or start local MongoDB service on port 27017\n` +
      `   Retrying connection in 15 seconds...\n\n`
    );
    scheduleRetry();
  }
}

function scheduleRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    void connectDatabase();
  }, 15000);
}

export async function disconnectDatabase() {
  if (retryTimer) clearTimeout(retryTimer);
  await mongoose.disconnect();
}
