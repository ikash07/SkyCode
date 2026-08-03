import path from 'node:path';

export function normalizeRelativePath(input: string): string {
  const normalized = input.replace(/\\+/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
  if (!normalized || normalized === '.') return '';
  const safe = path.posix.normalize(normalized).replace(/^\.\//, '');
  if (safe.startsWith('..')) {
    throw new Error('Invalid path');
  }
  return safe;
}

export function getPathParent(filePath: string): string {
  const normalized = normalizeRelativePath(filePath);
  const parent = path.posix.dirname(normalized);
  return parent === '.' ? '' : parent;
}

export function getFileName(filePath: string): string {
  return path.posix.basename(normalizeRelativePath(filePath));
}
