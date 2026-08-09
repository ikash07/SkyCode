import fs from 'node:fs/promises';
import path from 'node:path';

export const backendRoot = process.cwd();
export const storageRoot = path.resolve(backendRoot, 'storage');
export const projectsRoot = path.resolve(storageRoot, 'projects');
export const executionsRoot = path.resolve(storageRoot, 'executions');
export const cacheRoot = path.resolve(storageRoot, 'cache');

export async function ensureRuntimeDirectories() {
  await fs.mkdir(projectsRoot, { recursive: true });
  await fs.mkdir(executionsRoot, { recursive: true });
  await fs.mkdir(cacheRoot, { recursive: true });
  await fs.mkdir(path.resolve(cacheRoot, 'python'), { recursive: true });
  await fs.mkdir(path.resolve(cacheRoot, 'pip'), { recursive: true });
  await fs.mkdir(path.resolve(cacheRoot, 'm2'), { recursive: true });
  await fs.mkdir(path.resolve(cacheRoot, 'gradle'), { recursive: true });
}
