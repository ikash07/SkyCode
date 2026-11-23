import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { exists } from './fs.js';
import { restorePackageFromDatabase, savePackageToDatabase } from '../services/packageCacheService.js';

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
  'cv2': 'opencv-python-headless',
  'PIL': 'Pillow',
  'pillow': 'Pillow',
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
 * Transitive / companion package requirements.
 * When package A is imported, also install companion packages so runtime sub-imports never fail.
 */
const COMPANION_PACKAGES = {
  'opencv-python': ['opencv-python-headless'],
  'cv2': ['opencv-python-headless'],
  'PIL': ['Pillow'],
  'Pillow': ['Pillow'],
  'dotenv': ['python-dotenv'],
  'python-dotenv': ['python-dotenv'],
  'google-genai': ['google-genai'],
  'genai': ['google-genai'],
  'bs4': ['beautifulsoup4'],
  'beautifulsoup4': ['beautifulsoup4'],
  'scikit-learn': ['scikit-learn'],
  'sklearn': ['scikit-learn'],
  'fastapi': ['fastapi', 'uvicorn'],
};

/**
 * Universal inlined PyAudio cloud compatibility shim.
 * Guarantees that any SpeechRecognition or audio code executes with zero crashes in headless/cloud environments.
 */
const PYAUDIO_MODULE_CODE = `# SkyCode Universal PyAudio Cloud Compatibility Module
# Emulates PyAudio interface for headless / cloud / browser execution environments.

def get_sample_size(fmt):
    if fmt == 8: return 2
    if fmt == 1: return 4
    if fmt == 2: return 4
    if fmt == 4: return 3
    if fmt == 16: return 1
    return 2

class Stream:
    def __init__(self, *args, **kwargs):
        self._active = True
    def read(self, num_frames, exception_on_overflow=False):
        return b'\\x00' * (num_frames * 2)
    def write(self, data, num_frames=None, exception_on_underflow=False):
        pass
    def start_stream(self):
        self._active = True
    def stop_stream(self):
        self._active = False
    def close(self):
        self._active = False
    def is_active(self):
        return self._active
    def is_stopped(self):
        return not self._active

class PyAudio:
    def __init__(self):
        pass
    def get_device_count(self):
        return 1
    def get_default_input_device_info(self):
        return {
            'index': 0,
            'name': 'SkyCode Virtual Microphone (Online IDE)',
            'maxInputChannels': 2,
            'maxOutputChannels': 2,
            'defaultSampleRate': 16000.0,
            'hostApi': 0
        }
    def get_device_info_by_index(self, device_index):
        return self.get_default_input_device_info()
    def get_device_info_by_host_api_device_index(self, host_api, device_index):
        return self.get_default_input_device_info()
    def get_host_api_info_by_index(self, host_api_index):
        return {'index': 0, 'name': 'SkyCode Audio', 'deviceCount': 1, 'defaultInputDevice': 0, 'defaultOutputDevice': 0}
    def get_default_host_api_info(self):
        return self.get_host_api_info_by_index(0)
    def open(self, *args, **kwargs):
        return Stream(*args, **kwargs)
    def terminate(self):
        pass
    def get_sample_size(self, fmt):
        return get_sample_size(fmt)

# Standard format constants
paFloat32 = 1
paInt32 = 2
paInt24 = 4
paInt16 = 8
paInt8 = 16
paUInt8 = 32
paCustomFormat = 65536

# Stream flags
paNoFlag = 0
paClipOff = 1
paDitherOff = 2

# Callback return codes
paContinue = 0
paComplete = 1
paAbort = 2

__version__ = '0.2.14'
`;

/**
 * Universal sitecustomize.py cloud bridge.
 * Executed automatically by Python on startup to configure headless plotting
 * and browser open bridging.
 */
const SITECUSTOMIZE_CODE = `# SkyCode Cloud Runtime Environment Initializer
import sys
import os

# 1. Headless Matplotlib configuration
try:
    os.environ.setdefault('MPLBACKEND', 'Agg')
except Exception:
    pass

# 2. Browser Open Bridge (intercepts webbrowser.open to output in SkyCode terminal)
try:
    import webbrowser
    _orig_open = webbrowser.open
    def _skycode_open(url, *args, **kwargs):
        print(f"\\r\\n🌐 [SkyCode Browser] Opened URL: {url}\\r\\n", flush=True)
        try:
            return _orig_open(url, *args, **kwargs)
        except Exception:
            return True
    webbrowser.open = _skycode_open
except Exception:
    pass
`;

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
    PYTHONUNBUFFERED: '1',
    MPLBACKEND: 'Agg'
  };
}

/**
 * Helper to recursively scan all .py files in a project workspace
 */
async function getPythonFiles(dir, maxDepth = 4) {
  if (maxDepth <= 0) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__pycache__' || entry.name === 'venv') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await getPythonFiles(fullPath, maxDepth - 1);
      files.push(...subFiles);
    } else if (entry.name.endsWith('.py')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parse import statements from all Python source files in the workspace and return
 * the deduplicated list of third-party PyPI package names to install.
 *
 * @param {string} snapshotRoot  Absolute path to the execution snapshot directory
 * @param {string} entryFile     Relative path to the Python entry file
 * @returns {Promise<string[]>}  List of PyPI package names to install
 */
export async function detectPythonDependencies(snapshotRoot, entryFile) {
  const pyFiles = await getPythonFiles(snapshotRoot);
  const targetPath = path.join(snapshotRoot, entryFile);
  if (!pyFiles.includes(targetPath) && (await exists(targetPath))) {
    pyFiles.push(targetPath);
  }

  const imports = new Set();

  for (const file of pyFiles) {
    try {
      const source = await fs.readFile(file, 'utf8');
      for (const line of source.split(/\r?\n/)) {
        // Compound patterns
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
    } catch {
      // Ignore read errors
    }
  }

  // Filter out standard library modules
  const thirdParty = [...imports].filter((mod) => !BUILTIN_PYTHON_MODULES.has(mod));

  // Filter out local project modules and built-in cloud shims (pyaudio is emulated in cloud snapshot)
  const externalOnly = [];
  for (const mod of thirdParty) {
    if (mod === 'pyaudio') {
      continue;
    }
    const asFile = path.join(snapshotRoot, `${mod}.py`);
    const asPackage = path.join(snapshotRoot, mod, '__init__.py');
    const isLocal = (await exists(asFile)) || (await exists(asPackage));
    if (!isLocal) {
      externalOnly.push(mod);
    }
  }

  // Map import names to PyPI package names and expand companion dependencies
  const finalPackages = new Set();
  for (const mod of externalOnly) {
    const mapped = PYPI_PACKAGE_MAP[mod] || mod;
    finalPackages.add(mapped);

    const companions = COMPANION_PACKAGES[mod] || COMPANION_PACKAGES[mapped];
    if (companions) {
      for (const comp of companions) {
        finalPackages.add(comp);
      }
    }
  }

  return [...finalPackages];
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
 * locally before execution. Also installs from requirements.txt if present
 * and configures universal cloud compatibility shims (pyaudio, sitecustomize).
 *
 * @param {string} snapshotRoot  Absolute path to the execution snapshot directory
 * @param {string} entryFile     Relative path to the Python entry file
 * @param {Function} [onLog]     Optional logging callback to stream progress to terminal
 */
export async function ensureLocalPythonDependencies(snapshotRoot, entryFile, onLog = null) {
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const pythonFallback = process.platform === 'win32' ? 'python3' : 'python';
  const pythonEnv = getPythonEnvironment(snapshotRoot);

  // 1. Always inject universal PyAudio compatibility module into snapshotRoot
  const pyaudioPath = path.join(snapshotRoot, 'pyaudio.py');
  if (!(await exists(pyaudioPath))) {
    await fs.writeFile(pyaudioPath, PYAUDIO_MODULE_CODE, 'utf8').catch(() => {});
  }

  // 2. Always inject sitecustomize.py cloud bridge into snapshotRoot
  const sitecustomizePath = path.join(snapshotRoot, 'sitecustomize.py');
  if (!(await exists(sitecustomizePath))) {
    await fs.writeFile(sitecustomizePath, SITECUSTOMIZE_CODE, 'utf8').catch(() => {});
  }

  async function pipInstall(installArgs) {
    const baseArgs = ['-m', 'pip', 'install', ...installArgs, '--quiet', '--disable-pip-version-check', '--no-cache-dir', '--no-warn-script-location'];

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

  // 3. Install from requirements.txt if present
  const requirementsPath = path.join(snapshotRoot, 'requirements.txt');
  if (await exists(requirementsPath)) {
    try {
      if (onLog) onLog('[SkyCode] Installing dependencies from requirements.txt...\r\n');
      await pipInstall(['-r', requirementsPath]);
    } catch {
      // Ignore pip failures
    }
  }

  // 4. Detect and install third-party packages from imports across the project
  const packages = await detectPythonDependencies(snapshotRoot, entryFile);
  if (packages.length === 0) {
    return;
  }

  const homeDir = process.env.HOME || (process.platform === 'win32' ? process.env.USERPROFILE : '/home/render');
  const userSitePackages = path.join(homeDir || '', '.local', 'lib', 'python3.11', 'site-packages');
  await fs.mkdir(userSitePackages, { recursive: true }).catch(() => {});

  const allSiteDirs = [
    userSitePackages,
    path.join(homeDir || '', '.local', 'lib', 'python3.12', 'site-packages'),
    path.join(homeDir || '', '.local', 'lib', 'python3.10', 'site-packages'),
    path.join(homeDir || '', '.local', 'lib', 'python3.13', 'site-packages'),
    '/usr/local/lib/python3.11/dist-packages',
    '/usr/local/lib/python3.12/dist-packages',
    '/usr/lib/python3/dist-packages'
  ];

  const missingFromDisk = [];

  // Check if each package already exists in any site-packages directory or can be restored from persistent database
  for (const pkg of packages) {
    const pkgNorm = pkg.toLowerCase().replace(/[-_]/g, '');
    let isInstalled = false;

    for (const siteDir of allSiteDirs) {
      const entries = await fs.readdir(siteDir).catch(() => []);
      if (entries.some((e) => e.toLowerCase().replace(/[-_]/g, '').startsWith(pkgNorm))) {
        isInstalled = true;
        break;
      }
    }

    if (isInstalled) {
      continue;
    }

    // Attempt restoring instantly from MongoDB database
    const restored = await restorePackageFromDatabase(pkg, 'python', userSitePackages);
    if (restored) {
      if (onLog) onLog(`[SkyCode] Restored ${pkg} from persistent database store (0ms install).\r\n`);
    } else {
      missingFromDisk.push(pkg);
    }
  }

  if (missingFromDisk.length > 0) {
    for (const pkg of missingFromDisk) {
      try {
        if (onLog) {
          onLog(`[SkyCode] Installing ${pkg}...\r\n`);
        }
        const installRes = await pipInstall([pkg]);
        if (installRes.exitCode === 0) {
          if (onLog) onLog(`[SkyCode] Ready: ${pkg} installed.\r\n`);

          // Automatically archive and save newly installed package to MongoDB
          try {
            const entries = await fs.readdir(userSitePackages).catch(() => []);
            const pkgNorm = pkg.toLowerCase().replace(/[-_]/g, '');
            const matching = entries.filter((e) => e.toLowerCase().replace(/[-_]/g, '').startsWith(pkgNorm));
            if (matching.length > 0) {
              const saved = await savePackageToDatabase(pkg, 'python', userSitePackages, matching);
              if (saved && onLog) {
                onLog(`[SkyCode] Cached ${pkg} in database for future instant runs.\r\n`);
              }
            }
          } catch {
            // Ignore DB cache errors
          }
        }
      } catch {
        // Continue to next package
      }
    }
  }
}
