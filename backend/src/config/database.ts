import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env.js';

let inMemoryServer: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(env.MONGODB_URI);
    return;
  } catch (error) {
    if (env.MONGODB_URI.includes('127.0.0.1') || env.MONGODB_URI.includes('localhost')) {
      inMemoryServer = await MongoMemoryServer.create({ instance: { dbName: 'online_ide' } });
      await mongoose.connect(inMemoryServer.getUri());
      process.stdout.write('MongoDB not available locally, using in-memory MongoDB for development.\n');
      return;
    }

    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (inMemoryServer) {
    await inMemoryServer.stop();
    inMemoryServer = null;
  }
}
