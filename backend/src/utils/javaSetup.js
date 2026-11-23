import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { exists } from './fs.js';

let setupPromise = null;

/**
 * Resolves the path to `javac` and `java` binaries.
 * If not present on system PATH, checks `$HOME/.local/jdk/bin`.
 * If missing, downloads and extracts a portable headless OpenJDK into `$HOME/.local/jdk`.
 *
 * @param {Function} [onLog] Optional progress callback
 * @returns {Promise<{ javac: string, java: string }>}
 */
export async function ensureJavaJdk(onLog = null) {
  const homeDir = process.env.HOME || (process.platform === 'win32' ? process.env.USERPROFILE : '/home/render');
  const localJdkBin = path.join(homeDir || '', '.local', 'jdk', 'bin');
  const localJavac = path.join(localJdkBin, process.platform === 'win32' ? 'javac.exe' : 'javac');
  const localJava = path.join(localJdkBin, process.platform === 'win32' ? 'java.exe' : 'java');

  // 1. Check if local JDK is already extracted
  if ((await exists(localJavac)) && (await exists(localJava))) {
    return { javac: localJavac, java: localJava };
  }

  // 2. Check if javac is available on system PATH
  const isSystemAvailable = await checkCommandAvailable('javac');
  if (isSystemAvailable) {
    return { javac: 'javac', java: 'java' };
  }

  // 3. If running on Windows or non-Linux, return system commands
  if (process.platform !== 'linux') {
    return { javac: 'javac', java: 'java' };
  }

  // 4. On Linux (e.g. Render), download and extract Adoptium Temurin OpenJDK 17
  if (!setupPromise) {
    setupPromise = (async () => {
      const jdkDir = path.join(homeDir || '', '.local', 'jdk');
      await fs.mkdir(jdkDir, { recursive: true });

      if (onLog) {
        onLog('[SkyCode] Setting up Java JDK runtime environment (OpenJDK 17)...\r\n');
      }

      // Download and extract via curl and tar pipeline
      const downloadCmd = `curl -sSL "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse" | tar -xz -C "${jdkDir}" --strip-components=1`;

      const result = await new Promise((resolve) => {
        const child = spawn('/bin/sh', ['-c', downloadCmd], { windowsHide: true });
        let stderr = '';
        child.stderr?.on('data', (d) => { stderr += d.toString(); });
        child.on('close', (code) => {
          resolve({ exitCode: code ?? 1, stderr });
        });
        child.on('error', (err) => {
          resolve({ exitCode: 1, stderr: err.message });
        });
      });

      if (result.exitCode === 0 && (await exists(localJavac))) {
        if (onLog) {
          onLog('[SkyCode] Java JDK runtime ready.\r\n');
        }
        return { javac: localJavac, java: localJava };
      }

      if (onLog) {
        onLog('[SkyCode] Java setup finished, verifying binary...\r\n');
      }
      return {
        javac: (await exists(localJavac)) ? localJavac : 'javac',
        java: (await exists(localJava)) ? localJava : 'java'
      };
    })().finally(() => {
      setupPromise = null;
    });
  }

  return setupPromise;
}

function checkCommandAvailable(command) {
  return new Promise((resolve) => {
    const child = spawn(command, ['-version'], { windowsHide: true });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0 || code === 2));
  });
}
