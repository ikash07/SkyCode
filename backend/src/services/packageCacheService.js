import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { PackageStore } from '../models/PackageStore.js';
import { exists } from '../utils/fs.js';

function runProcess(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Restores a previously saved package from MongoDB into the target directory.
 * @param {string} packageName
 * @param {'python' | 'node'} language
 * @param {string} targetDir
 * @returns {Promise<boolean>}
 */
export async function restorePackageFromDatabase(packageName, language, targetDir) {
  if (mongoose.connection.readyState !== 1) return false;
  try {
    const record = await PackageStore.findOne({ name: packageName.toLowerCase(), language }).lean();
    if (!record || !record.archiveBase64) return false;

    const tmpArchive = path.join(os.tmpdir(), `skycode-${randomUUID()}.tar.gz`);
    const buffer = Buffer.from(record.archiveBase64, 'base64');
    await fs.writeFile(tmpArchive, buffer);

    await fs.mkdir(targetDir, { recursive: true });
    const success = await runProcess('tar', ['-xzf', tmpArchive, '-C', targetDir]);
    await fs.unlink(tmpArchive).catch(() => {});
    return success;
  } catch (err) {
    console.error(`[SkyCode DB Cache] Restore error for ${packageName}:`, err.message);
    return false;
  }
}

/**
 * Saves an installed package from source directory into MongoDB for permanent persistence across container restarts.
 * @param {string} packageName
 * @param {'python' | 'node'} language
 * @param {string} sourceDir
 * @param {string[]} itemNames
 * @returns {Promise<boolean>}
 */
export async function savePackageToDatabase(packageName, language, sourceDir, itemNames) {
  if (mongoose.connection.readyState !== 1) return false;
  try {
    const items = Array.isArray(itemNames) ? itemNames : [itemNames];
    const existingItems = [];
    for (const item of items) {
      if (await exists(path.join(sourceDir, item))) {
        existingItems.push(item);
      }
    }
    if (existingItems.length === 0) return false;

    const tmpArchive = path.join(os.tmpdir(), `skycode-${randomUUID()}.tar.gz`);
    const success = await runProcess('tar', ['-czf', tmpArchive, '-C', sourceDir, ...existingItems]);
    if (!success) {
      await fs.unlink(tmpArchive).catch(() => {});
      return false;
    }

    const buffer = await fs.readFile(tmpArchive);
    await fs.unlink(tmpArchive).catch(() => {});

    // MongoDB document size limit is 16MB (BSON limit)
    // Keep individual package archive under 14MB
    if (buffer.length > 14 * 1024 * 1024) return false;

    const archiveBase64 = buffer.toString('base64');
    await PackageStore.findOneAndUpdate(
      { name: packageName.toLowerCase(), language },
      {
        name: packageName.toLowerCase(),
        language,
        archiveBase64,
        sizeBytes: buffer.length,
        installedAt: new Date()
      },
      { upsert: true, new: true }
    );
    return true;
  } catch (err) {
    console.error(`[SkyCode DB Cache] Save error for ${packageName}:`, err.message);
    return false;
  }
}
