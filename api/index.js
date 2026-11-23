import { createApp } from '../backend/src/app.js';
import { connectDatabase } from '../backend/src/config/database.js';
import { ensureRuntimeDirectories } from '../backend/src/utils/runtimePaths.js';

let appInstance = null;
let initPromise = null;

async function getApp() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await ensureRuntimeDirectories();
      } catch (e) {
        console.warn('Failed to ensure runtime dirs:', e.message);
      }
      try {
        await connectDatabase();
      } catch (e) {
        console.warn('MongoDB initial connection:', e.message);
      }
      return createApp();
    })();
  }
  return initPromise;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
