import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { exists } from './fs.js';

/**
 * Built-in Node.js core modules.
 * These are included in the Node.js runtime and should never be installed from npm.
 */
const BUILTIN_NODE_MODULES = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'fs/promises', 'http', 'http2', 'https', 'inspector',
  'module', 'net', 'os', 'path', 'path/posix', 'path/win32', 'perf_hooks',
  'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
  'stream/promises', 'stream/consumers', 'stream/web', 'string_decoder',
  'test', 'timers', 'timers/promises', 'tls', 'trace_events', 'tty',
  'url', 'util', 'util/types', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib',
  'node:assert', 'node:async_hooks', 'node:buffer', 'node:child_process',
  'node:cluster', 'node:console', 'node:constants', 'node:crypto',
  'node:dgram', 'node:diagnostics_channel', 'node:dns', 'node:domain',
  'node:events', 'node:fs', 'node:fs/promises', 'node:http', 'node:http2',
  'node:https', 'node:inspector', 'node:module', 'node:net', 'node:os',
  'node:path', 'node:perf_hooks', 'node:process', 'node:punycode',
  'node:querystring', 'node:readline', 'node:repl', 'node:stream',
  'node:string_decoder', 'node:test', 'node:timers', 'node:tls',
  'node:trace_events', 'node:tty', 'node:url', 'node:util', 'node:v8',
  'node:vm', 'node:wasi', 'node:worker_threads', 'node:zlib'
]);

/**
 * Helper to recursively scan all JS/MJS/TS files in a project workspace
 */
async function getJsFiles(dir, maxDepth = 4) {
  if (maxDepth <= 0) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getJsFiles(fullPath, maxDepth - 1);
      files.push(...subFiles);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.mjs') || entry.name.endsWith('.cjs') || entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Detect all third-party npm packages imported/required in the workspace.
 */
export async function detectNodeDependencies(snapshotRoot, entryFile) {
  const jsFiles = await getJsFiles(snapshotRoot);
  const targetPath = path.join(snapshotRoot, entryFile);
  if (!jsFiles.includes(targetPath) && (await exists(targetPath))) {
    jsFiles.push(targetPath);
  }

  const imports = new Set();

  for (const file of jsFiles) {
    try {
      const source = await fs.readFile(file, 'utf8');
      for (const line of source.split(/\r?\n/)) {
        // match require('pkg') or require("pkg")
        const requireMatches = line.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
        for (const match of requireMatches) {
          const mod = match[1].trim();
          if (!mod.startsWith('.') && !mod.startsWith('/') && !mod.startsWith('#')) {
            const pkgName = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
            imports.add(pkgName);
          }
        }

        // match import ... from 'pkg' or import('pkg')
        const fromMatches = line.matchAll(/from\s+['"]([^'"]+)['"]/g);
        for (const match of fromMatches) {
          const mod = match[1].trim();
          if (!mod.startsWith('.') && !mod.startsWith('/') && !mod.startsWith('#')) {
            const pkgName = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
            imports.add(pkgName);
          }
        }

        const dynamicImportMatches = line.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
        for (const match of dynamicImportMatches) {
          const mod = match[1].trim();
          if (!mod.startsWith('.') && !mod.startsWith('/') && !mod.startsWith('#')) {
            const pkgName = mod.startsWith('@') ? mod.split('/').slice(0, 2).join('/') : mod.split('/')[0];
            imports.add(pkgName);
          }
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // Filter out Node standard library
  return [...imports].filter((pkg) => !BUILTIN_NODE_MODULES.has(pkg));
}

function runShort(command, args, cwd, timeoutSeconds = 120) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let finished = false;

    const timeout = setTimeout(() => {
      finished = true;
      child.kill('SIGKILL');
      resolve({ stdout, stderr: `${stderr}\nTimed out after ${timeoutSeconds}s`, exitCode: 124 });
    }, timeoutSeconds * 1000);

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    child.on('error', (err) => {
      clearTimeout(timeout);
      if (!finished) resolve({ stdout, stderr: `${stderr}\n${err.message}`, exitCode: 1 });
    });

    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      if (!finished) resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
    });
  });
}

/**
 * Ensure that all third-party npm dependencies are installed before Node.js execution.
 */
export async function ensureLocalNodeDependencies(snapshotRoot, entryFile, onLog = null) {
  const packages = await detectNodeDependencies(snapshotRoot, entryFile);
  const packageJsonPath = path.join(snapshotRoot, 'package.json');
  const hasPackageJson = await exists(packageJsonPath);

  if (packages.length === 0 && !hasPackageJson) {
    return;
  }

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  if (hasPackageJson && packages.length === 0) {
    try {
      const nodeModules = path.join(snapshotRoot, 'node_modules');
      if (!(await exists(nodeModules))) {
        if (onLog) onLog('[SkyCode] Installing dependencies from package.json...\r\n');
        await runShort(npmCmd, ['install', '--no-audit', '--no-fund', '--prefer-offline'], snapshotRoot, 120);
      }
    } catch {
      // Ignore failures
    }
    return;
  }

  // Check which packages are actually missing from node_modules
  const missing = [];
  for (const pkg of packages) {
    const pkgDir = path.join(snapshotRoot, 'node_modules', pkg);
    if (!(await exists(pkgDir))) {
      missing.push(pkg);
    }
  }

  if (missing.length === 0) {
    return;
  }

  try {
    if (onLog) {
      onLog(`[SkyCode] Auto-installing missing npm packages: ${missing.join(', ')}...\r\n`);
    }

    // Ensure package.json exists so npm install works cleanly in snapshot
    if (!hasPackageJson) {
      await fs.writeFile(
        packageJsonPath,
        JSON.stringify({ name: 'skycode-workspace', version: '1.0.0', type: 'module' }, null, 2),
        'utf8'
      ).catch(() => {});
    }

    const res = await runShort(npmCmd, ['install', '--no-audit', '--no-fund', ...missing], snapshotRoot, 120);
    if (res.exitCode === 0) {
      if (onLog) onLog(`[SkyCode] Ready: ${missing.join(', ')} installed.\r\n`);
    }
  } catch {
    // Proceed with execution
  }
}
