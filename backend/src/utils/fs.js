import fs from 'node:fs/promises';
import path from 'node:path';
import { AppError } from './appError.js';
import { normalizeRelativePath } from './path.js';

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function removeIfExists(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

export async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function readTextFile(targetPath) {
  return fs.readFile(targetPath, 'utf8');
}

export async function writeTextFile(targetPath, content) {
  await ensureDir(path.dirname(targetPath));
  await fs.writeFile(targetPath, content, 'utf8');
}

export async function copyDirectory(source, destination) {
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true });
  await fs.cp(source, destination, {
    recursive: true,
    filter: (src) => {
      const name = path.basename(src);
      return name !== 'node_modules' && name !== '.git' && name !== 'dist' && name !== '.cache';
    }
  });
}

export function assertPathWithin(root, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const resolved = path.resolve(root, normalized);
  const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new AppError('Path escapes project root', 400);
  }
  return resolved;
}
