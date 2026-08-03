import fs from 'node:fs/promises';
import path from 'node:path';

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
  size?: number;
}

async function buildTree(rootPath: string, currentPath: string): Promise<TreeNode[]> {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  const nodes: TreeNode[] = [];

  for (const entry of entries.sort((left, right) => Number(right.isDirectory()) - Number(left.isDirectory()) || left.name.localeCompare(right.name))) {
    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(rootPath, absolutePath).replace(/\\+/g, '/');

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: 'directory',
        children: await buildTree(rootPath, absolutePath)
      });
      continue;
    }

    const stats = await fs.stat(absolutePath);
    nodes.push({
      name: entry.name,
      path: relativePath,
      type: 'file',
      size: stats.size
    });
  }

  return nodes;
}

export async function createTree(rootPath: string): Promise<TreeNode[]> {
  return buildTree(rootPath, rootPath);
}
