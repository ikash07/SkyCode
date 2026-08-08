import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    process.stdout.write(`✅ MongoDB connected successfully to: ${env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}\n`);
  });

  mongoose.connection.on('error', (err) => {
    process.stderr.write(`❌ MongoDB connection error: ${err.message}\n`);
  });

  mongoose.connection.on('disconnected', () => {
    process.stdout.write('⚠️  MongoDB disconnected\n');
  });

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    process.stderr.write(
      `\n❌ Failed to connect to MongoDB!\n` +
      `   URI: ${env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}\n` +
      `   Error: ${err.message}\n\n` +
      `   💡 To fix this:\n` +
      `      1. Set MONGODB_URI in backend/.env to a valid MongoDB connection string\n` +
      `      2. For free cloud hosting, use MongoDB Atlas: https://www.mongodb.com/cloud/atlas\n` +
      `      3. Example: mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/online_ide\n\n`
    );
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
