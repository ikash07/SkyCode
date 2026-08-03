import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import pLimit from 'p-limit';
import { env } from '../config/env.js';
import { cacheRoot, executionsRoot } from '../utils/runtimePaths.js';
import { copyDirectory, exists, removeIfExists } from '../utils/fs.js';

export interface ExecutionInput {
  language: 'python' | 'c' | 'java';
  projectRoot: string;
  entryFile: string;
  command: string;
  cacheKey: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  command: string;
  workingDirectory: string;
}

const concurrencyLimiter = pLimit(2);

function runProcess(command: string, args: string[], timeoutSeconds: number): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let finished = false;

    const timeout = setTimeout(() => {
      finished = true;
      child.kill('SIGKILL');
      resolve({ stdout, stderr: `${stderr}\nExecution timed out after ${timeoutSeconds}s`.trim(), exitCode: 124, timedOut: true });
    }, timeoutSeconds * 1000);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      if (!finished) reject(error);
    });

    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      if (finished) {
        return;
      }
      resolve({ stdout, stderr, exitCode: exitCode ?? 1, timedOut: false });
    });
  });
}

async function runDockerContainer(args: string[], timeoutSeconds: number): Promise<{ stdout: string; stderr: string; exitCode: number; timedOut: boolean }> {
  return runProcess('docker', args, timeoutSeconds);
}

async function runLocalPython(snapshotRoot: string, entryFile: string): Promise<ExecutionResult> {
  const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
  const result = await runProcess(pythonCommand, [path.join(snapshotRoot, entryFile)], env.DOCKER_EXECUTION_TIMEOUT_SECONDS);
  return {
    ...result,
    command: `${pythonCommand} ${entryFile}`,
    workingDirectory: snapshotRoot
  };
}

async function runLocalC(snapshotRoot: string): Promise<ExecutionResult> {
  const sourceFiles = await fs.readdir(snapshotRoot, { recursive: true }).catch(() => [] as string[]);
  const cFiles = sourceFiles.filter((file) => file.toString().endsWith('.c'));
  if (cFiles.length === 0) {
    throw new Error('No C source files found');
  }

  const outputBinary = path.join(snapshotRoot, process.platform === 'win32' ? 'program.exe' : 'program');
  const compile = await runProcess('gcc', [...cFiles.map((file) => path.join(snapshotRoot, file.toString())), '-o', outputBinary, '-O2', '-std=c17', '-Wall', '-Wextra', '-lm', '-lpthread', '-lcurl', '-lsqlite3', '-lssl', '-lcrypto', '-lz'], env.DOCKER_EXECUTION_TIMEOUT_SECONDS);
  if (compile.exitCode !== 0) {
    return {
      stdout: compile.stdout,
      stderr: compile.stderr,
      exitCode: compile.exitCode,
      timedOut: compile.timedOut,
      command: `gcc ${cFiles.join(' ')} -o ${path.basename(outputBinary)}`,
      workingDirectory: snapshotRoot
    };
  }

  const runBinary = await runProcess(outputBinary, [], env.DOCKER_EXECUTION_TIMEOUT_SECONDS);
  return {
    ...runBinary,
    command: path.basename(outputBinary),
    workingDirectory: snapshotRoot
  };
}

async function runLocalJava(snapshotRoot: string, entryFile: string): Promise<ExecutionResult> {
  const javaCommand = process.platform === 'win32' ? 'java' : 'java';
  const javacCommand = process.platform === 'win32' ? 'javac' : 'javac';
  const sourceFiles = await fs.readdir(snapshotRoot, { recursive: true }).catch(() => [] as string[]);
  const javaFiles = sourceFiles.filter((file) => file.toString().endsWith('.java'));
  if (javaFiles.length === 0) {
    throw new Error('No Java source files found');
  }

  const classesDir = path.join(snapshotRoot, 'classes');
  await fs.mkdir(classesDir, { recursive: true });
  const compile = await runProcess(javacCommand, ['-d', classesDir, ...javaFiles.map((file) => path.join(snapshotRoot, file.toString()))], env.DOCKER_EXECUTION_TIMEOUT_SECONDS);
  if (compile.exitCode !== 0) {
    return {
      stdout: compile.stdout,
      stderr: compile.stderr,
      exitCode: compile.exitCode,
      timedOut: compile.timedOut,
      command: `javac ${javaFiles.join(' ')}`,
      workingDirectory: snapshotRoot
    };
  }

  const mainClass = path.basename(entryFile, '.java');
  const runBinary = await runProcess(javaCommand, ['-cp', classesDir, mainClass], env.DOCKER_EXECUTION_TIMEOUT_SECONDS);
  return {
    ...runBinary,
    command: `java -cp ${classesDir} ${mainClass}`,
    workingDirectory: snapshotRoot
  };
}

async function prepareSnapshot(projectRoot: string): Promise<string> {
  const executionId = randomUUID();
  const snapshotRoot = path.join(executionsRoot, executionId);
  await copyDirectory(projectRoot, snapshotRoot);
  return snapshotRoot;
}

async function detectPythonPackages(snapshotRoot: string, entryFile: string): Promise<string[]> {
  const targetPath = path.join(snapshotRoot, entryFile);
  if (!(await exists(targetPath))) {
    return [];
  }

  const source = await fs.readFile(targetPath, 'utf8');
  const imports = new Set<string>();
  for (const line of source.split(/\r?\n/)) {
    const importMatch = line.match(/^\s*import\s+([a-zA-Z0-9_\.]+)/);
    if (importMatch) {
      imports.add(importMatch[1].split('.')[0]);
    }
    const fromMatch = line.match(/^\s*from\s+([a-zA-Z0-9_\.]+)\s+import\s+/);
    if (fromMatch) {
      imports.add(fromMatch[1].split('.')[0]);
    }
  }

  const builtin = new Set(['os', 'sys', 'json', 'math', 'time', 'pathlib', 'typing', 'subprocess', 'collections', 'dataclasses', 'asyncio', 're', 'itertools', 'threading', 'logging', 'statistics', 'functools', 'random', 'datetime', 'enum', 'hashlib', 'heapq', 'queue', 'tempfile', 'unittest', 'http', 'csv']);
  return [...imports].filter((item) => !builtin.has(item));
}

function getPythonCommand(entryFile: string): string {
  return `export HOME=/home/runner && export PYTHONUSERBASE=/home/runner/.local && python3 ${entryFile}`;
}

function getCCompileCommand(): string {
  return `gcc $(find . -name "*.c" -print) -o /tmp/program -O2 -std=c17 -Wall -Wextra -lm -lpthread -lcurl -lsqlite3 -lssl -lcrypto -lz && /tmp/program`;
}

function getJavaMainClass(sourceRoot: string, entryFile: string): Promise<string> {
  return fs.readFile(path.join(sourceRoot, entryFile), 'utf8').then((source) => {
    const packageMatch = source.match(/^\s*package\s+([a-zA-Z0-9_.]+);/m);
    const className = path.basename(entryFile, '.java');
    return packageMatch ? `${packageMatch[1]}.${className}` : className;
  });
}

async function buildPythonRun(snapshotRoot: string, entryFile: string): Promise<ExecutionResult> {
  const packages = await detectPythonPackages(snapshotRoot, entryFile);
  const installPackages = packages.length > 0 ? `python3 -m pip install --user ${packages.join(' ')} && ` : '';
  const command = `${installPackages}${getPythonCommand(entryFile)}`;
  try {
    return await runDockerContainer([
      'run',
      '--rm',
      '--network', 'none',
      '--cpus', `${env.DOCKER_EXECUTION_CPU_QUOTA}`,
      '--memory', `${env.DOCKER_EXECUTION_MEMORY_MB}m`,
      '--pids-limit', '128',
      '--security-opt', 'no-new-privileges',
      '--cap-drop', 'ALL',
      '--read-only',
      '--tmpfs', '/tmp:rw,nosuid,noexec,size=64m',
      '--user', '1000:1000',
      '--env', 'HOME=/home/runner',
      '--env', 'PYTHONUSERBASE=/home/runner/.local',
      '--env', 'PIP_CACHE_DIR=/home/runner/.cache/pip',
      '--volume', `${snapshotRoot}:/workspace:ro`,
      '--volume', `${path.join(cacheRoot, 'python')}:/home/runner/.local`,
      '--volume', `${path.join(cacheRoot, 'pip')}:/home/runner/.cache/pip`,
      '--workdir', '/workspace',
      'python:3.12-slim',
      'sh',
      '-lc',
      command
    ], env.DOCKER_EXECUTION_TIMEOUT_SECONDS);
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return runLocalPython(snapshotRoot, entryFile);
    }
    throw error;
  }
}

async function buildCRun(snapshotRoot: string): Promise<ExecutionResult> {
  const command = getCCompileCommand();
  try {
    return await runDockerContainer([
      'run',
      '--rm',
      '--network', 'none',
      '--cpus', `${env.DOCKER_EXECUTION_CPU_QUOTA}`,
      '--memory', `${env.DOCKER_EXECUTION_MEMORY_MB}m`,
      '--pids-limit', '128',
      '--security-opt', 'no-new-privileges',
      '--cap-drop', 'ALL',
      '--read-only',
      '--tmpfs', '/tmp:rw,nosuid,noexec,size=64m',
      '--user', '1000:1000',
      '--volume', `${snapshotRoot}:/workspace:ro`,
      '--workdir', '/workspace',
      'gcc:14-bookworm',
      'sh',
      '-lc',
      command
    ], env.DOCKER_EXECUTION_TIMEOUT_SECONDS);
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      return runLocalC(snapshotRoot);
    }
    throw error;
  }
}

async function buildJavaRun(snapshotRoot: string, entryFile: string): Promise<ExecutionResult> {
  const mainClass = await getJavaMainClass(snapshotRoot, entryFile);
  const hasPom = await exists(path.join(snapshotRoot, 'pom.xml'));
  const hasGradle = (await exists(path.join(snapshotRoot, 'build.gradle'))) || (await exists(path.join(snapshotRoot, 'build.gradle.kts')));

  let command = '';
  if (hasPom) {
    command = `mvn -q -DskipTests compile dependency:build-classpath -Dmdep.outputFile=/tmp/classpath.txt && java -cp "target/classes:$(cat /tmp/classpath.txt)" ${mainClass}`;
  } else if (hasGradle) {
    command = `gradle -q classes && java -cp "build/classes/java/main:build/resources/main" ${mainClass}`;
  } else {
    command = `mkdir -p /tmp/classes && javac -d /tmp/classes $(find . -name "*.java" -print) && java -cp /tmp/classes ${mainClass}`;
  }

  return runDockerContainer([
    'run',
    '--rm',
    '--network', 'none',
    '--cpus', `${env.DOCKER_EXECUTION_CPU_QUOTA}`,
    '--memory', `${env.DOCKER_EXECUTION_MEMORY_MB}m`,
    '--pids-limit', '128',
    '--security-opt', 'no-new-privileges',
    '--cap-drop', 'ALL',
    '--read-only',
    '--tmpfs', '/tmp:rw,nosuid,noexec,size=128m',
    '--user', '1000:1000',
    '--env', 'HOME=/home/runner',
    '--volume', `${snapshotRoot}:/workspace:ro`,
    '--volume', `${path.join(cacheRoot, 'm2')}:/home/runner/.m2`,
    '--volume', `${path.join(cacheRoot, 'gradle')}:/home/runner/.gradle`,
    '--workdir', '/workspace',
    'eclipse-temurin:21-jdk',
    'sh',
    '-lc',
    command
  ], env.DOCKER_EXECUTION_TIMEOUT_SECONDS);
}

async function runLocalJavaFallback(snapshotRoot: string, entryFile: string): Promise<ExecutionResult> {
  return runLocalJava(snapshotRoot, entryFile);
}

export async function executeInDocker(input: ExecutionInput): Promise<ExecutionResult> {
  return concurrencyLimiter(async () => {
    const snapshotRoot = await prepareSnapshot(input.projectRoot);

    try {
      if (input.language === 'python') {
        return await buildPythonRun(snapshotRoot, input.entryFile);
      }

      if (input.language === 'c') {
        return await buildCRun(snapshotRoot);
      }

      try {
        return await buildJavaRun(snapshotRoot, input.entryFile);
      } catch (error) {
        if (error instanceof Error && error.message.includes('ENOENT')) {
          return runLocalJavaFallback(snapshotRoot, input.entryFile);
        }
        throw error;
      }
    } finally {
      await removeIfExists(snapshotRoot);
    }
  });
}
