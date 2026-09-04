import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { exists } from './fs.js';

/**
 * Comprehensive set of Python standard library modules.
 * These should never be pip-installed.
 */
const BUILTIN_PYTHON_MODULES = new Set([
  // Core / always available
  'os', 'sys', 'json', 'math', 'time', 'pathlib', 'typing', 'subprocess',
  'collections', 'dataclasses', 'asyncio', 're', 'itertools', 'threading',
  'logging', 'statistics', 'functools', 'random', 'datetime', 'enum',
  'hashlib', 'heapq', 'queue', 'tempfile', 'unittest', 'http', 'csv',
  // Additional stdlib
  'abc', 'argparse', 'array', 'ast', 'atexit', 'base64', 'binascii',
  'bisect', 'builtins', 'calendar', 'cgi', 'cgitb', 'cmath', 'cmd',
  'code', 'codecs', 'codeop', 'colorsys', 'compileall', 'concurrent',
  'configparser', 'contextlib', 'contextvars', 'copy', 'copyreg',
  'cProfile', 'crypt', 'ctypes', 'curses', 'dbm', 'decimal', 'difflib',
  'dis', 'distutils', 'doctest', 'email', 'encodings', 'ensurepip',
  'errno', 'faulthandler', 'fcntl', 'filecmp', 'fileinput', 'fnmatch',
  'fractions', 'ftplib', 'gc', 'getopt', 'getpass', 'gettext', 'glob',
  'grp', 'gzip', 'hmac', 'html', 'idlelib', 'imaplib', 'imghdr',
  'imp', 'importlib', 'inspect', 'io', 'ipaddress', 'keyword',
  'lib2to3', 'linecache', 'locale', 'lzma', 'mailbox', 'mailcap',
  'marshal', 'mimetypes', 'mmap', 'modulefinder', 'multiprocessing',
  'netrc', 'nis', 'nntplib', 'numbers', 'operator', 'optparse',
  'ossaudiodev', 'parser', 'pdb', 'pickle', 'pickletools', 'pipes',
  'pkgutil', 'platform', 'plistlib', 'poplib', 'posix', 'posixpath',
  'pprint', 'profile', 'pstats', 'pty', 'pwd', 'py_compile',
  'pyclbr', 'pydoc', 'reprlib', 'resource', 'rlcompleter', 'runpy',
  'sched', 'secrets', 'select', 'selectors', 'shelve', 'shlex',
  'shutil', 'signal', 'site', 'smtpd', 'smtplib', 'sndhdr', 'socket',
  'socketserver', 'sqlite3', 'ssl', 'stat', 'string', 'stringprep',
  'struct', 'sunau', 'symtable', 'sysconfig', 'syslog', 'tabnanny',
  'tarfile', 'telnetlib', 'termios', 'test', 'textwrap', 'token',
  'tokenize', 'tomllib', 'trace', 'traceback', 'tracemalloc', 'tty',
  'turtle', 'turtledemo', 'types', 'unicodedata', 'urllib', 'uu',
  'uuid', 'venv', 'warnings', 'wave', 'weakref', 'webbrowser',
  'winreg', 'winsound', 'wsgiref', 'xdrlib', 'xml', 'xmlrpc',
  'zipapp', 'zipfile', 'zipimport', 'zlib', '_thread',
  // Tkinter family
  'tkinter', 'Tkinter',
]);

/**
 * Maps Python import names to their PyPI package names
 * when they differ from the import name.
 */
const PYPI_PACKAGE_MAP = {
  'speech_recognition': 'SpeechRecognition',
  'SpeechRecognition': 'SpeechRecognition',
  'edge_tts': 'edge-tts',
  'cv2': 'opencv-python',
  'PIL': 'Pillow',
  'bs4': 'beautifulsoup4',
  'yaml': 'PyYAML',
  'dotenv': 'python-dotenv',
  'sklearn': 'scikit-learn',
  'skimage': 'scikit-image',
  'attr': 'attrs',
  'gi': 'PyGObject',
  'wx': 'wxPython',
  'Crypto': 'pycryptodome',
  'serial': 'pyserial',
  'usb': 'pyusb',
  'socks': 'PySocks',
  'magic': 'python-magic',
  'dateutil': 'python-dateutil',
  'docx': 'python-docx',
  'pptx': 'python-pptx',
  'jwt': 'PyJWT',
  'lxml': 'lxml',
  'dns': 'dnspython',
  'bson': 'pymongo',
  'nacl': 'PyNaCl',
  'mutagen': 'mutagen',
  'pydub': 'pydub',
  'gtts': 'gTTS',
  'fitz': 'PyMuPDF',
  'pyautogui': 'PyAutoGUI',
  'speedtest': 'speedtest-cli',
  'qrcode': 'qrcode',
  'colorama': 'colorama',
  'tqdm': 'tqdm',
  'flask': 'flask',
  'django': 'django',
  'fastapi': 'fastapi',
  'uvicorn': 'uvicorn',
  'requests': 'requests',
  'aiohttp': 'aiohttp',
  'httpx': 'httpx',
  'numpy': 'numpy',
  'pandas': 'pandas',
  'matplotlib': 'matplotlib',
  'scipy': 'scipy',
  'seaborn': 'seaborn',
  'plotly': 'plotly',
  'sympy': 'sympy',
  'tensorflow': 'tensorflow',
  'torch': 'torch',
  'keras': 'keras',
  'transformers': 'transformers',
  'openai': 'openai',
  'langchain': 'langchain',
  'pygame': 'pygame',
  'pyperclip': 'pyperclip',
  'playsound': 'playsound',
  'pyttsx3': 'pyttsx3',
  'rich': 'rich',
  'click': 'click',
  'typer': 'typer',
  'tabulate': 'tabulate',
  'pymongo': 'pymongo',
  'psycopg2': 'psycopg2-binary',
  'mysql': 'mysql-connector-python',
  'sqlalchemy': 'SQLAlchemy',
  'redis': 'redis',
  'celery': 'celery',
  'scrapy': 'Scrapy',
  'selenium': 'selenium',
  'playwright': 'playwright',
  'tweepy': 'tweepy',
  'discord': 'discord.py',
  'telegram': 'python-telegram-bot',
  'boto3': 'boto3',
  'paramiko': 'paramiko',
  'fabric': 'fabric',
  'cryptography': 'cryptography',
  'bcrypt': 'bcrypt',
  'passlib': 'passlib',
  'jinja2': 'Jinja2',
  'Jinja2': 'Jinja2',
  'markdown': 'Markdown',
  'pygments': 'Pygments',
  'arrow': 'arrow',
  'pendulum': 'pendulum',
  'schedule': 'schedule',
  'apscheduler': 'APScheduler',
  'APScheduler': 'APScheduler',
  'pytest': 'pytest',
  'hypothesis': 'hypothesis',
  'mock': 'mock',
  'coverage': 'coverage',
  'black': 'black',
  'pylint': 'pylint',
  'mypy': 'mypy',
  'flake8': 'flake8',
  'isort': 'isort',
  'setuptools': 'setuptools',
  'wheel': 'wheel',
  'twine': 'twine',
  'pip': 'pip',
  'virtualenv': 'virtualenv',
  'pipenv': 'pipenv',
  'google': 'google-genai',
  'google-genai': 'google-genai',
  'google-generativeai': 'google-generativeai',
  'genai': 'google-genai',
};

/**
 * Returns an execution environment with user site-packages and local bin in PATH,
 * ensuring newly installed Python packages can be loaded in any Linux or Windows environment.
 */
export function getPythonEnvironment(snapshotRoot) {
  const homeDir = process.env.HOME || (process.platform === 'win32' ? process.env.USERPROFILE : '/home/render');
  const userLocalBin = path.join(homeDir || '', '.local', 'bin');
  const siteDirs = [
    path.join(homeDir || '', '.local', 'lib', 'python3.13', 'site-packages'),
    path.join(homeDir || '', '.local', 'lib', 'python3.12', 'site-packages'),
    path.join(homeDir || '', '.local', 'lib', 'python3.11', 'site-packages'),
    path.join(homeDir || '', '.local', 'lib', 'python3.10', 'site-packages')
  ];

  const pythonPathParts = [snapshotRoot, ...siteDirs];
  if (process.env.PYTHONPATH) {
    pythonPathParts.push(process.env.PYTHONPATH);
  }

  const pathParts = [userLocalBin];
  if (process.env.PATH) {
    pathParts.push(process.env.PATH);
  }

  return {
    ...process.env,
    PYTHONUSERBASE: path.join(homeDir || '', '.local'),
    PYTHONPATH: pythonPathParts.join(path.delimiter),
    PATH: pathParts.join(path.delimiter),
    PYTHONUNBUFFERED: '1'
  };
}

/**
 * Parse import statements from a Python source file and return
 * the list of third-party PyPI package names to install.
 *
 * @param {string} snapshotRoot  Absolute path to the execution snapshot directory
 * @param {string} entryFile     Relative path to the Python entry file
 * @returns {Promise<string[]>}  List of PyPI package names to install
 */
export async function detectPythonDependencies(snapshotRoot, entryFile) {
  const targetPath = path.join(snapshotRoot, entryFile);
  if (!(await exists(targetPath))) {
    return [];
  }

  const source = await fs.readFile(targetPath, 'utf8');
  const imports = new Set();
  for (const line of source.split(/\r?\n/)) {
    // Check specific known compound patterns
    if (/^\s*from\s+google\s+import\s+genai/i.test(line) || /^\s*import\s+google\.genai/i.test(line)) {
      imports.add('google-genai');
      continue;
    }
    if (/^\s*from\s+google\s+import\s+generativeai/i.test(line) || /^\s*import\s+google\.generativeai/i.test(line)) {
      imports.add('google-generativeai');
      continue;
    }

    const importMatch = line.match(/^\s*import\s+([a-zA-Z0-9_.]+)/);
    if (importMatch) {
      imports.add(importMatch[1].split('.')[0]);
    }
    const fromMatch = line.match(/^\s*from\s+([a-zA-Z0-9_.]+)\s+import\s+/);
    if (fromMatch) {
      imports.add(fromMatch[1].split('.')[0]);
    }
  }

  // Filter out standard library modules
  const thirdParty = [...imports].filter((mod) => !BUILTIN_PYTHON_MODULES.has(mod));

  // Filter out local project modules (files that exist in the workspace)
  const externalOnly = [];
  for (const mod of thirdParty) {
    const asFile = path.join(snapshotRoot, `${mod}.py`);
    const asPackage = path.join(snapshotRoot, mod, '__init__.py');
    const isLocal = (await exists(asFile)) || (await exists(asPackage));
    if (!isLocal) {
      externalOnly.push(mod);
    }
  }

  // Map import names to PyPI package names
  return externalOnly.map((mod) => PYPI_PACKAGE_MAP[mod] || mod);
}

/**
 * Run a short-lived process and return its result.
 */
function runShort(command, args, timeoutSeconds = 120, extraEnv = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      env: { ...process.env, ...extraEnv }
    });
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
 * Ensure that all detected third-party Python packages are installed
 * locally before execution. Also installs from requirements.txt if present.
 *
 * @param {string} snapshotRoot  Absolute path to the execution snapshot directory
 * @param {string} entryFile     Relative path to the Python entry file
 * @param {Function} [onLog]     Optional logging callback to stream progress to terminal
 */
export async function ensureLocalPythonDependencies(snapshotRoot, entryFile, onLog = null) {
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const pythonFallback = process.platform === 'win32' ? 'python3' : 'python';
  const pythonEnv = getPythonEnvironment(snapshotRoot);

  async function pipInstall(installArgs) {
    const baseArgs = ['-m', 'pip', 'install', ...installArgs, '--quiet', '--disable-pip-version-check'];

    // Strategy 1: python3 -m pip install --user --break-system-packages (ideal for Linux non-root / Render / Debian 12+)
    let result = await runShort(pythonCmd, [...baseArgs, '--user', '--break-system-packages'], 180, pythonEnv);
    if (result.exitCode === 0) return result;

    // Strategy 2: python3 -m pip install --break-system-packages (root or system container)
    result = await runShort(pythonCmd, [...baseArgs, '--break-system-packages'], 180, pythonEnv);
    if (result.exitCode === 0) return result;

    // Strategy 3: python3 -m pip install --user (Windows or systems without PEP 668)
    result = await runShort(pythonCmd, [...baseArgs, '--user'], 180, pythonEnv);
    if (result.exitCode === 0) return result;

    // Strategy 4: python3 -m pip install (vanilla)
    result = await runShort(pythonCmd, baseArgs, 180, pythonEnv);
    if (result.exitCode === 0) return result;

    // Strategy 5: fallback python command
    result = await runShort(pythonFallback, [...baseArgs, '--user', '--break-system-packages'], 180, pythonEnv);
    if (result.exitCode === 0) return result;

    // Strategy 6: try bare pip3/pip
    const pipCmd = process.platform === 'win32' ? 'pip' : 'pip3';
    result = await runShort(pipCmd, ['install', ...installArgs, '--user', '--break-system-packages', '--quiet', '--disable-pip-version-check'], 180, pythonEnv);
    if (result.exitCode === 0) return result;

    return result;
  }

  // 0. Bootstrap pip if not available (e.g. minimal Python installs on Render / Ubuntu)
  try {
    const pipCheck = await runShort(pythonCmd, ['-m', 'pip', '--version'], 10, pythonEnv);
    if (pipCheck.exitCode !== 0) {
      if (onLog) onLog('[SkyCode] Bootstrapping pip package manager...\r\n');
      const ensureRes = await runShort(pythonCmd, ['-m', 'ensurepip', '--default-pip'], 30, pythonEnv);
      if (ensureRes.exitCode !== 0 && process.platform !== 'win32') {
        try {
          const https = await import('node:https');
          const fsSync = await import('node:fs');
          const tmpPip = path.join('/tmp', 'get-pip.py');
          await new Promise((res, rej) => {
            const file = fsSync.createWriteStream(tmpPip);
            https.get('https://bootstrap.pypa.io/get-pip.py', (resp) => {
              if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
                https.get(resp.headers.location, (r) => {
                  r.pipe(file);
                  file.on('finish', () => file.close(res));
                }).on('error', rej);
              } else {
                resp.pipe(file);
                file.on('finish', () => file.close(res));
              }
            }).on('error', rej);
          });
          await runShort(pythonCmd, [tmpPip, '--user', '--break-system-packages', '--no-warn-script-location'], 120, pythonEnv);
          await fs.unlink(tmpPip).catch(() => {});
        } catch (bootstrapErr) {
          console.error('[SkyCode] Failed to bootstrap pip:', bootstrapErr.message);
        }
      }
    }
  } catch {
    // Ignore — pip may still work
  }

  // 1. Install from requirements.txt if it exists
  const requirementsPath = path.join(snapshotRoot, 'requirements.txt');
  if (await exists(requirementsPath)) {
    try {
      if (onLog) onLog('[SkyCode] Installing dependencies from requirements.txt...\r\n');
      await pipInstall(['-r', requirementsPath]);
    } catch {
      // Ignore pip failures
    }
  }

  // 2. Detect and install third-party packages from imports
  const packages = await detectPythonDependencies(snapshotRoot, entryFile);
  if (packages.length === 0) {
    return;
  }

  try {
    if (onLog) {
      onLog(`[SkyCode] Installing missing packages: ${packages.join(', ')}...\r\n`);
    }
    const installRes = await pipInstall(packages);
    if (installRes.exitCode === 0) {
      if (onLog) onLog(`[SkyCode] Ready: ${packages.join(', ')} installed.\r\n`);
    }
  } catch {
    // Ignore — the execution itself will report the ImportError
  }
}
