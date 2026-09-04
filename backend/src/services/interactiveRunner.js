import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { executionsRoot } from '../utils/runtimePaths.js';
import { copyDirectory, removeIfExists } from '../utils/fs.js';
import { ensureLocalPythonDependencies, getPythonEnvironment } from '../utils/pythonPackages.js';

function runCompileProcess(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      resolve({ exitCode: 1, stdout, stderr: `${stderr}\n${err.message}` });
    });

    child.on('close', (exitCode) => {
      resolve({ exitCode: exitCode ?? 1, stdout, stderr });
    });
  });
}

async function getJavaMainClass(snapshotRoot, entryFile) {
  try {
    const source = await fs.readFile(path.join(snapshotRoot, entryFile), 'utf8');
    const packageMatch = source.match(/^\s*package\s+([a-zA-Z0-9_.]+);/m);
    const className = path.basename(entryFile, '.java');
    return packageMatch ? `${packageMatch[1]}.${className}` : className;
  } catch {
    return path.basename(entryFile, '.java');
  }
}

async function getCSourceFilesToCompile(snapshotRoot, entryFile) {
  const targetEntry = path.join(snapshotRoot, entryFile);
  const sourceFiles = await fs.readdir(snapshotRoot, { recursive: true }).catch(() => []);
  const cFiles = sourceFiles.filter((file) => file.toString().endsWith('.c')).map((file) => path.join(snapshotRoot, file.toString()));

  if (cFiles.length <= 1) {
    return cFiles.length === 1 ? cFiles : [targetEntry];
  }

  // Filter out any other .c files that contain a main() function to avoid duplicate definition of 'main'
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
      // Ignore read errors
    }
  }

  return filesToCompile.length > 0 ? filesToCompile : [targetEntry];
}

export async function spawnInteractiveExecution(input) {
  const { language, projectRoot, entryFile, onStdout, onStderr, onExit } = input;
  const executionId = randomUUID();
  const snapshotRoot = path.join(executionsRoot, executionId);
  await copyDirectory(projectRoot, snapshotRoot);

  let commandString = '';
  let childProcess = null;
  let finished = false;

  const cleanup = async () => {
    await removeIfExists(snapshotRoot).catch(() => {});
  };

  const handleClose = (exitCode) => {
    if (finished) return;
    finished = true;
    void cleanup();
    if (onExit) onExit(exitCode ?? 0);
  };

  try {
    if (language === 'javascript' || language === 'node') {
      commandString = `node ${entryFile}`;
      childProcess = spawn('node', [path.join(snapshotRoot, entryFile)], {
        cwd: snapshotRoot,
        windowsHide: true
      });
    } else if (language === 'python') {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      commandString = `${pythonCmd} -u ${entryFile}`;

      // Auto-install missing Python dependencies before execution
      try {
        await ensureLocalPythonDependencies(snapshotRoot, entryFile, (logChunk) => {
          if (onStdout) onStdout(logChunk);
        });
      } catch {
        // Ignore install errors — the script itself will report ImportError
      }

      const pythonEnv = getPythonEnvironment(snapshotRoot);

      childProcess = spawn(pythonCmd, ['-u', path.join(snapshotRoot, entryFile)], {
        cwd: snapshotRoot,
        env: pythonEnv,
        windowsHide: true
      });
    } else if (language === 'c') {
      const cFilesToCompile = await getCSourceFilesToCompile(snapshotRoot, entryFile);
      if (cFilesToCompile.length === 0) {
        if (onStderr) onStderr('No C source files found (.c)\n');
        handleClose(1);
        return { command: 'gcc', writeInput: () => {}, kill: () => {} };
      }

      // Inject unbuffer header so printf prompts flush instantly without waiting for \n
      const unbufferHeader = path.join(snapshotRoot, '__unbuffer.h');
      await fs.writeFile(
        unbufferHeader,
        `#include <stdio.h>\nstatic void __attribute__((constructor)) __unbuffer_stdio(void) {\n    setvbuf(stdout, NULL, _IONBF, 0);\n    setvbuf(stderr, NULL, _IONBF, 0);\n}\n`
      );

      const outputBinary = path.join(snapshotRoot, process.platform === 'win32' ? 'program.exe' : 'program');
      const relativeFiles = cFilesToCompile.map((f) => path.relative(snapshotRoot, f));
      commandString = `gcc ${relativeFiles.join(' ')} -o ${path.basename(outputBinary)} && ${path.basename(outputBinary)}`;

      // '-O0' flag ensures super fast instant compilation (20ms instead of 500ms)
      const compile = await runCompileProcess(
        'gcc',
        ['-include', unbufferHeader, ...cFilesToCompile, '-o', outputBinary, '-O0', '-std=c17', '-lm'],
        snapshotRoot
      );

      if (compile.exitCode !== 0) {
        if (compile.stdout && onStdout) onStdout(compile.stdout);
        if (compile.stderr && onStderr) onStderr(compile.stderr);
        handleClose(compile.exitCode);
        return { command: commandString, writeInput: () => {}, kill: () => {} };
      }

      childProcess = spawn(outputBinary, [], {
        cwd: snapshotRoot,
        windowsHide: true
      });
    } else {
      // Java
      const sourceFiles = await fs.readdir(snapshotRoot, { recursive: true }).catch(() => []);
      const javaFiles = sourceFiles.filter((file) => file.toString().endsWith('.java'));
      if (javaFiles.length === 0) {
        if (onStderr) onStderr('No Java source files found (.java)\n');
        handleClose(1);
        return { command: 'javac', writeInput: () => {}, kill: () => {} };
      }

      const classesDir = path.join(snapshotRoot, 'classes');
      await fs.mkdir(classesDir, { recursive: true });

      const mainClass = await getJavaMainClass(snapshotRoot, entryFile);
      commandString = `javac *.java && java -cp classes ${mainClass}`;

      const compile = await runCompileProcess('javac', ['-d', classesDir, ...javaFiles.map((f) => path.join(snapshotRoot, f.toString()))], snapshotRoot);

      if (compile.exitCode !== 0) {
        if (compile.stdout && onStdout) onStdout(compile.stdout);
        if (compile.stderr && onStderr) onStderr(compile.stderr);
        handleClose(compile.exitCode);
        return { command: commandString, writeInput: () => {}, kill: () => {} };
      }

      childProcess = spawn('java', ['-Dfile.encoding=UTF-8', '-cp', classesDir, mainClass], {
        cwd: snapshotRoot,
        windowsHide: true
      });
    }

    if (!childProcess) {
      if (onStderr) onStderr('Failed to spawn execution process\n');
      handleClose(1);
      return { command: commandString, writeInput: () => {}, kill: () => {} };
    }

    // Attach stream listeners
    childProcess.stdout.on('data', (chunk) => {
      if (onStdout) onStdout(chunk.toString());
    });

    childProcess.stderr.on('data', (chunk) => {
      if (onStderr) onStderr(chunk.toString());
    });

    childProcess.on('error', (err) => {
      if (onStderr) onStderr(`${err.message}\n`);
      handleClose(1);
    });

    childProcess.on('close', (exitCode) => {
      handleClose(exitCode);
    });

    return {
      command: commandString,
      writeInput: (data) => {
        if (childProcess && childProcess.stdin && !childProcess.stdin.destroyed) {
          childProcess.stdin.write(data);
        }
      },
      kill: () => {
        if (childProcess && !finished) {
          childProcess.kill('SIGKILL');
          handleClose(137);
        }
      }
    };
  } catch (err) {
    if (onStderr) onStderr(`Execution error: ${err.message}\n`);
    handleClose(1);
    return { command: commandString, writeInput: () => {}, kill: () => {} };
  }
}
