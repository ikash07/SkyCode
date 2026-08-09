import path from 'node:path';

export function normalizeRelativePath(input) {
  const normalized = input.replace(/\\+/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
  if (!normalized || normalized === '.') return '';
  const safe = path.posix.normalize(normalized).replace(/^\.\//, '');
  if (safe.startsWith('..')) {
    throw new Error('Invalid path');
  }
  return safe;
}

export function getPathParent(filePath) {
  const normalized = normalizeRelativePath(filePath);
  const parent = path.posix.dirname(normalized);
  return parent === '.' ? '' : parent;
}

export function getFileName(filePath) {
  return path.posix.basename(normalizeRelativePath(filePath));
}
