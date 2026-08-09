import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import pLimit from 'p-limit';
import { env } from '../config/env.js';
import { cacheRoot, executionsRoot } from '../utils/runtimePaths.js';
import { copyDirectory, exists, removeIfExists } from '../utils/fs.js';

const concurrencyLimiter = pLimit(2);

function runProcess(command, args, timeoutSeconds, stdin = '') {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let finished = false;

    if (stdin && child.stdin) {
      child.stdin.write(stdin);
      child.stdin.end();
    }

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

async function runDockerContainer(args, timeoutSeconds, stdin = '') {
  return runProcess('docker', args, timeoutSeconds, stdin);
}

function isDockerFailure(result) {
  if (!result) return true;
  const combined = (result.stderr || '') + (result.stdout || '');
  return (
    combined.includes('Cannot connect to the Docker daemon') ||
    combined.includes('docker: command not found') ||
    combined.includes('Is the docker daemon running') ||
    combined.includes('error during connect')
  );
}

async function runLocalPython(snapshotRoot, entryFile, stdin = '') {
  const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
  try {
    const result = await runProcess(pythonCommand, [path.join(snapshotRoot, entryFile)], env.DOCKER_EXECUTION_TIMEOUT_SECONDS, stdin);
    return {
      ...result,
      command: `${pythonCommand} ${entryFile}`,
      workingDirectory: snapshotRoot
    };
  } catch (err) {
    return {
      stdout: '',
      stderr: `Failed to run Python locally: ${err.message}. Make sure Python is installed and in PATH.`,
      exitCode: 1,
      timedOut: false,
      command: `${pythonCommand} ${entryFile}`,
      workingDirectory: snapshotRoot
    };
  }
}

async function getCSourceFilesToCompile(snapshotRoot, entryFile) {
  const targetEntry = path.join(snapshotRoot, entryFile || '');
  const sourceFiles = await fs.readdir(snapshotRoot, { recursive: true }).catch(() => []);
  const cFiles = sourceFiles.filter((file) => file.toString().endsWith('.c')).map((file) => path.join(snapshotRoot, file.toString()));

  if (cFiles.length <= 1) {
    return cFiles.length === 1 ? cFiles : [targetEntry];
  }

  const filesToCompile = [];
  for (const file of cFiles) {
    if (path.normalize(file) === path.normalize(targetEntry)) {
      filesToCompile.push(file);
      continue;
    }
    try {
      const content = await fs.readFile(file, 'utf8');
      const hasMain = /^\s*(int|void)\s+main\s*\(/m.test(content);
      if (!hasMain) {
        filesToCompile.push(file);
      }
    } catch {
      // Ignore
    }
  }

  return filesToCompile.length > 0 ? filesToCompile : [targetEntry];
}

async function runLocalC(snapshotRoot, entryFile = '', stdin = '') {
  const cFiles = await getCSourceFilesToCompile(snapshotRoot, entryFile);
  if (cFiles.length === 0) {
    return {
      stdout: '',
      stderr: 'No C source files found (.c)',
      exitCode: 1,
      timedOut: false,
      command: 'gcc',
      workingDirectory: snapshotRoot
    };
  }

  const outputBinary = path.join(snapshotRoot, process.platform === 'win32' ? 'program.exe' : 'program');
  const relativeFiles = cFiles.map((f) => path.relative(snapshotRoot, f));
  try {
    const compile = await runProcess('gcc', [...cFiles, '-o', outputBinary, '-O2', '-std=c17', '-Wall', '-Wextra', '-lm'], env.DOCKER_EXECUTION_TIMEOUT_SECONDS);
    if (compile.exitCode !== 0) {
      return {
        stdout: compile.stdout,
        stderr: compile.stderr,
        exitCode: compile.exitCode,
        timedOut: compile.timedOut,
        command: `gcc ${relativeFiles.join(' ')} -o ${path.basename(outputBinary)}`,
        workingDirectory: snapshotRoot
      };
    }

    const runBinary = await runProcess(outputBinary, [], env.DOCKER_EXECUTION_TIMEOUT_SECONDS, stdin);
    return {
      ...runBinary,
      command: path.basename(outputBinary),
      workingDirectory: snapshotRoot
    };
  } catch (err) {
    return {
      stdout: '',
      stderr: `Failed to compile/run C locally: ${err.message}. Make sure GCC is installed and in PATH.`,
      exitCode: 1,
      timedOut: false,
      command: 'gcc',
      workingDirectory: snapshotRoot
    };
  }
}

async function runLocalJava(snapshotRoot, entryFile, stdin = '') {
  const javaCommand = 'java';
  const javacCommand = 'javac';
  const sourceFiles = await fs.readdir(snapshotRoot, { recursive: true }).catch(() => []);
  const javaFiles = sourceFiles.filter((file) => file.toString().endsWith('.java'));
  if (javaFiles.length === 0) {
    return {
      stdout: '',
      stderr: 'No Java source files found (.java)',
      exitCode: 1,
      timedOut: false,
      command: 'javac',
      workingDirectory: snapshotRoot
    };
  }

  const classesDir = path.join(snapshotRoot, 'classes');
  await fs.mkdir(classesDir, { recursive: true });
  try {
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
    const runBinary = await runProcess(javaCommand, ['-cp', classesDir, mainClass], env.DOCKER_EXECUTION_TIMEOUT_SECONDS, stdin);
    return {
      ...runBinary,
      command: `java -cp classes ${mainClass}`,
      workingDirectory: snapshotRoot
    };
  } catch (err) {
    return {
      stdout: '',
      stderr: `Failed to compile/run Java locally: ${err.message}. Make sure JDK (javac/java) is installed and in PATH.`,
      exitCode: 1,
      timedOut: false,
      command: 'javac',
      workingDirectory: snapshotRoot
    };
  }
}

async function prepareSnapshot(projectRoot) {
  const executionId = randomUUID();
  const snapshotRoot = path.join(executionsRoot, executionId);
  await copyDirectory(projectRoot, snapshotRoot);
  return snapshotRoot;
}

async function detectPythonPackages(snapshotRoot, entryFile) {
  const targetPath = path.join(snapshotRoot, entryFile);
  if (!(await exists(targetPath))) {
    return [];
  }

  const source = await fs.readFile(targetPath, 'utf8');
  const imports = new Set();
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

function getPythonCommand(entryFile) {
  return `export HOME=/home/runner && export PYTHONUSERBASE=/home/runner/.local && python3 ${entryFile}`;
}

function getCCompileCommand() {
  return `gcc $(find . -name "*.c" -print) -o /tmp/program -O2 -std=c17 -Wall -Wextra -lm -lpthread -lcurl -lsqlite3 -lssl -lcrypto -lz && /tmp/program`;
}

function getJavaMainClass(sourceRoot, entryFile) {
  return fs.readFile(path.join(sourceRoot, entryFile), 'utf8').then((source) => {
    const packageMatch = source.match(/^\s*package\s+([a-zA-Z0-9_.]+);/m);
    const className = path.basename(entryFile, '.java');
    return packageMatch ? `${packageMatch[1]}.${className}` : className;
  });
}

async function buildPythonRun(snapshotRoot, entryFile, stdin = '') {
  const packages = await detectPythonPackages(snapshotRoot, entryFile);
  const installPackages = packages.length > 0 ? `python3 -m pip install --user ${packages.join(' ')} && ` : '';
  const command = `${installPackages}${getPythonCommand(entryFile)}`;
  try {
    const result = await runDockerContainer([
      'run',
      '-i',
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
    ], env.DOCKER_EXECUTION_TIMEOUT_SECONDS, stdin);

    if (isDockerFailure(result)) {
      return runLocalPython(snapshotRoot, entryFile, stdin);
    }
    return result;
  } catch {
    return runLocalPython(snapshotRoot, entryFile, stdin);
  }
}

async function buildCRun(snapshotRoot, stdin = '') {
  const command = getCCompileCommand();
  try {
    const result = await runDockerContainer([
      'run',
      '-i',
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
    ], env.DOCKER_EXECUTION_TIMEOUT_SECONDS, stdin);

    if (isDockerFailure(result)) {
      return runLocalC(snapshotRoot, stdin);
    }
    return result;
  } catch {
    return runLocalC(snapshotRoot, stdin);
  }
}

async function buildJavaRun(snapshotRoot, entryFile, stdin = '') {
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

  try {
    const result = await runDockerContainer([
      'run',
      '-i',
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
    ], env.DOCKER_EXECUTION_TIMEOUT_SECONDS, stdin);

    if (isDockerFailure(result)) {
      return runLocalJava(snapshotRoot, entryFile, stdin);
    }
    return result;
  } catch {
    return runLocalJava(snapshotRoot, entryFile, stdin);
  }
}

export async function executeInDocker(input) {
  return concurrencyLimiter(async () => {
    const snapshotRoot = await prepareSnapshot(input.projectRoot);

    try {
      if (input.language === 'python') {
        return await buildPythonRun(snapshotRoot, input.entryFile, input.stdin ?? '');
      }

      if (input.language === 'c') {
        return await buildCRun(snapshotRoot, input.stdin ?? '');
      }

      return await buildJavaRun(snapshotRoot, input.entryFile, input.stdin ?? '');
    } finally {
      await removeIfExists(snapshotRoot);
    }
  });
}
