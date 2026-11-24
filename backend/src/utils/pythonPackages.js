import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { exists } from './fs.js';
import { restorePackageFromDatabase, savePackageToDatabase } from '../services/packageCacheService.js';
import { PackageStore } from '../models/PackageStore.js';

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
  'edge-tts': ['edge-tts', 'aiohttp'],
  'edge_tts': ['edge-tts', 'aiohttp'],
  'opencv-python': ['opencv-python-headless'],
  'cv2': ['opencv-python-headless'],
  'PIL': ['Pillow'],
  'Pillow': ['Pillow'],
  'dotenv': ['python-dotenv'],
  'python-dotenv': ['python-dotenv'],
  'google-genai': ['google-genai', 'pydantic', 'httpx'],
  'genai': ['google-genai', 'pydantic', 'httpx'],
  'bs4': ['beautifulsoup4'],
  'beautifulsoup4': ['beautifulsoup4'],
  'scikit-learn': ['scikit-learn', 'scipy', 'numpy'],
  'sklearn': ['scikit-learn', 'scipy', 'numpy'],
  'fastapi': ['fastapi', 'uvicorn', 'pydantic'],
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

# 3. Namespace Package Bridge (ensures namespace packages like google.genai find all site-packages directories)
try:
    for sp in list(sys.path):
        for ns in ['google', 'azure']:
            ns_cand = os.path.join(sp, ns)
            if os.path.isdir(ns_cand):
                try:
                    mod = __import__(ns)
                    if hasattr(mod, '__path__') and ns_cand not in mod.__path__:
                        mod.__path__.append(ns_cand)
                except Exception:
                    pass
except Exception:
    pass

# 4. Universal PyAudio Cloud Compatibility Bridge
# Pre-populates sys.modules so SpeechRecognition and audio scripts execute in headless cloud with zero errors
try:
    if 'pyaudio' not in sys.modules:
        import types
        _pa = types.ModuleType('pyaudio')
        _pa.__file__ = '<skycode_pyaudio>'
        _pa.__version__ = '0.2.14'
        _pa.paFloat32, _pa.paInt32, _pa.paInt24, _pa.paInt16 = 1, 2, 4, 8
        _pa.paInt8, _pa.paUInt8, _pa.paCustomFormat = 16, 32, 65536
        _pa.paNoFlag, _pa.paClipOff, _pa.paDitherOff = 0, 1, 2
        _pa.paContinue, _pa.paComplete, _pa.paAbort = 0, 1, 2
        _pa.get_sample_size = lambda fmt: 2
        class _SkyStream:
            def __init__(self, *args, **kwargs): self._active = True
            def read(self, n, *a, **k): return b'\\x00' * (n * 2)
            def write(self, *a, **k): pass
            def start_stream(self): self._active = True
            def stop_stream(self): self._active = False
            def close(self): self._active = False
            def is_active(self): return self._active
            def is_stopped(self): return not self._active
        class _SkyPyAudio:
            def __init__(self, *args, **kwargs): pass
            def get_device_count(self): return 1
            def get_default_input_device_info(self):
                return {'index': 0, 'name': 'SkyCode Virtual Microphone', 'maxInputChannels': 2, 'maxOutputChannels': 2, 'defaultSampleRate': 16000.0, 'hostApi': 0}
            def get_device_info_by_index(self, idx): return self.get_default_input_device_info()
            def get_device_info_by_host_api_device_index(self, h, idx): return self.get_default_input_device_info()
            def get_host_api_info_by_index(self, idx): return {'index': 0, 'name': 'SkyCode Audio', 'deviceCount': 1, 'defaultInputDevice': 0, 'defaultOutputDevice': 0}
            def get_default_host_api_info(self): return self.get_host_api_info_by_index(0)
            def open(self, *args, **kwargs): return _SkyStream(*args, **kwargs)
            def terminate(self): pass
            def get_sample_size(self, fmt): return 2
        _pa.Stream = _SkyStream
        _pa.PyAudio = _SkyPyAudio
        sys.modules['pyaudio'] = _pa
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
    path.join(homeDir || '', '.local', 'lib', 'python3.11', 'site-packages'),
    path.join(homeDir || '', '.local', 'lib', 'python3.12', 'site-packages'),
    path.join(homeDir || '', '.local', 'lib', 'python3.10', 'site-packages'),
    path.join(homeDir || '', '.local', 'lib', 'python3.13', 'site-packages'),
    '/opt/render/.local/lib/python3.11/site-packages',
    '/opt/render/.local/lib/python3.12/site-packages',
    '/home/render/.local/lib/python3.11/site-packages'
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
  const targetPath = path.join(snapshotRoot, entryFile || '');
  const filesToScan = new Set();

  if (entryFile && (await exists(targetPath))) {
    filesToScan.add(targetPath);
  } else {
    const allPy = await getPythonFiles(snapshotRoot);
    allPy.forEach((f) => filesToScan.add(f));
  }

  const scanned = new Set();
  const queue = [...filesToScan];
  const imports = new Set();

  while (queue.length > 0) {
    const file = queue.shift();
    if (scanned.has(file)) continue;
    scanned.add(file);

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
          const mod = importMatch[1].split('.')[0];
          imports.add(mod);
          const localPy = path.join(snapshotRoot, `${mod}.py`);
          const localPkg = path.join(snapshotRoot, mod, '__init__.py');
          if ((await exists(localPy)) && !scanned.has(localPy)) queue.push(localPy);
          if ((await exists(localPkg)) && !scanned.has(localPkg)) queue.push(localPkg);
        }
        const fromMatch = line.match(/^\s*from\s+([a-zA-Z0-9_.]+)\s+import\s+/);
        if (fromMatch) {
          const mod = fromMatch[1].split('.')[0];
          imports.add(mod);
          const localPy = path.join(snapshotRoot, `${mod}.py`);
          const localPkg = path.join(snapshotRoot, mod, '__init__.py');
          if ((await exists(localPy)) && !scanned.has(localPy)) queue.push(localPy);
          if ((await exists(localPkg)) && !scanned.has(localPkg)) queue.push(localPkg);
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
const IMPORT_TEST_MAP = {
  'google-genai': 'google.genai',
  'google-generativeai': 'google.generativeai',
  'SpeechRecognition': 'speech_recognition',
  'edge-tts': 'edge_tts',
  'opencv-python-headless': 'cv2',
  'Pillow': 'PIL',
  'python-dotenv': 'dotenv',
  'scikit-learn': 'sklearn',
  'beautifulsoup4': 'bs4',
  'PyYAML': 'yaml'
};

const MODULE_DIR_MAP = {
  'google-genai': ['google', 'google_genai'],
  'google-generativeai': ['google', 'google_generativeai'],
  'SpeechRecognition': ['speech_recognition', 'SpeechRecognition'],
  'edge-tts': ['edge_tts'],
  'opencv-python-headless': ['cv2'],
  'Pillow': ['PIL', 'Pillow'],
  'python-dotenv': ['dotenv'],
  'scikit-learn': ['sklearn'],
  'beautifulsoup4': ['bs4'],
  'PyYAML': ['yaml']
};

// Global in-memory cache of verified importable packages on this server instance (0ms lookup)
const verifiedImportableCache = new Set();

async function batchCheckImportable(pkgList, pythonCmd, pythonEnv) {
  if (pkgList.length === 0) return { succeeded: [], failed: [] };

  const modPairs = pkgList.map((pkg) => ({
    pkg,
    mod: IMPORT_TEST_MAP[pkg] || pkg.toLowerCase().replace(/[-]/g, '_')
  }));

  const pyCode = `import sys
pairs = ${JSON.stringify(modPairs)}
failed = []
for p in pairs:
    try:
        __import__(p['mod'])
    except Exception:
        failed.append(p['pkg'])
print(','.join(failed))`;

  try {
    const res = await runShort(pythonCmd, ['-c', pyCode], 5, pythonEnv);
    const failedNames = new Set(
      res.stdout.trim() ? res.stdout.trim().split(',').map((s) => s.trim()) : []
    );
    const succeeded = [];
    const failed = [];
    for (const p of pkgList) {
      if (failedNames.has(p)) {
        failed.push(p);
      } else {
        succeeded.push(p);
      }
    }
    return { succeeded, failed };
  } catch {
    return { succeeded: [], failed: pkgList };
  }
}

async function isPackageImportable(modName, pythonCmd, pythonEnv) {
  try {
    const res = await runShort(pythonCmd, ['-c', `import ${modName}`], 3, pythonEnv);
    return res.exitCode === 0;
  } catch {
    return false;
  }
}

export async function ensureLocalPythonDependencies(snapshotRoot, entryFile, onLog = null) {
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  const pythonFallback = process.platform === 'win32' ? 'python3' : 'python';
  const pythonEnv = getPythonEnvironment(snapshotRoot);

  // 1. Always inject universal PyAudio compatibility module into snapshotRoot and siteDirs
  const pyaudioPath = path.join(snapshotRoot, 'pyaudio.py');
  if (!(await exists(pyaudioPath))) {
    await fs.writeFile(pyaudioPath, PYAUDIO_MODULE_CODE, 'utf8').catch(() => {});
  }

  // 2. Always inject sitecustomize.py cloud bridge into snapshotRoot
  const sitecustomizePath = path.join(snapshotRoot, 'sitecustomize.py');
  if (!(await exists(sitecustomizePath))) {
    await fs.writeFile(sitecustomizePath, SITECUSTOMIZE_CODE, 'utf8').catch(() => {});
  }

  // Inject universal shims directly into site-packages directories so any package (e.g. SpeechRecognition) finds pyaudio
  const homeDir = process.env.HOME || (process.platform === 'win32' ? process.env.USERPROFILE : '/home/render');
  const candidateSiteDirs = [
    path.join(homeDir || '', '.local', 'lib', 'python3.11', 'site-packages'),
    path.join(homeDir || '', '.local', 'lib', 'python3.12', 'site-packages'),
    '/opt/render/.local/lib/python3.11/site-packages',
    '/opt/render/.local/lib/python3.12/site-packages'
  ];
  for (const sDir of candidateSiteDirs) {
    try {
      await fs.mkdir(sDir, { recursive: true });
      const shimFile = path.join(sDir, 'pyaudio.py');
      if (!(await exists(shimFile))) {
        await fs.writeFile(shimFile, PYAUDIO_MODULE_CODE, 'utf8');
      }
      const scFile = path.join(sDir, 'sitecustomize.py');
      if (!(await exists(scFile))) {
        await fs.writeFile(scFile, SITECUSTOMIZE_CODE, 'utf8');
      }
    } catch {}
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

  // Fast path: if all packages were already verified importable on this instance, skip immediately (0ms!)
  const unverified = packages.filter((pkg) => !verifiedImportableCache.has(pkg));
  if (unverified.length === 0) {
    return;
  }

  const userSitePackages = path.join(homeDir || '', '.local', 'lib', 'python3.11', 'site-packages');
  await fs.mkdir(userSitePackages, { recursive: true }).catch(() => {});

  // Fast batch check: check all unverified packages in 1 single 40ms Python process
  const { succeeded, failed } = await batchCheckImportable(unverified, pythonCmd, pythonEnv);
  for (const pkg of succeeded) {
    verifiedImportableCache.add(pkg);
  }

  if (failed.length === 0) {
    return;
  }

  const missingFromDisk = [];

  // For any failed packages, attempt restoring from MongoDB database
  for (const pkg of failed) {
    const modName = IMPORT_TEST_MAP[pkg] || pkg.toLowerCase().replace(/[-]/g, '_');
    const restored = await restorePackageFromDatabase(pkg, 'python', userSitePackages);
    if (restored) {
      const worksNow = await isPackageImportable(modName, pythonCmd, pythonEnv);
      if (worksNow) {
        verifiedImportableCache.add(pkg);
        if (onLog) onLog(`[SkyCode] Restored ${pkg} from persistent database store (0ms install).\r\n`);
        continue;
      } else {
        // Corrupted or incomplete record in DB - delete it so it can be cleanly re-installed
        await PackageStore.deleteOne({ name: pkg.toLowerCase(), language: 'python' }).catch(() => {});
      }
    }

    missingFromDisk.push(pkg);
  }

  if (missingFromDisk.length > 0) {
    if (onLog) {
      onLog(`[SkyCode] Installing missing dependencies: ${missingFromDisk.join(', ')}...\r\n`);
    }

    // Fast Strategy: Attempt installing all missing packages in 1 batch pip command
    const batchRes = await pipInstall(missingFromDisk);
    const successfullyInstalled = [];

    if (batchRes.exitCode === 0) {
      successfullyInstalled.push(...missingFromDisk);
      if (onLog) {
        onLog(`[SkyCode] Ready: ${missingFromDisk.join(', ')} installed.\r\n`);
      }
    } else {
      // Fallback: try one by one only if combined batch failed
      for (const pkg of missingFromDisk) {
        try {
          if (onLog) onLog(`[SkyCode] Installing ${pkg}...\r\n`);
          const singleRes = await pipInstall([pkg]);
          if (singleRes.exitCode === 0) {
            successfullyInstalled.push(pkg);
            if (onLog) onLog(`[SkyCode] Ready: ${pkg} installed.\r\n`);
          }
        } catch {
          // Continue
        }
      }
    }

    // Register all successfully installed packages & cache to MongoDB
    for (const pkg of successfullyInstalled) {
      verifiedImportableCache.add(pkg);
      try {
        const entries = await fs.readdir(userSitePackages).catch(() => []);
        const pkgNorm = pkg.toLowerCase().replace(/[-_]/g, '');
        const extraDirs = MODULE_DIR_MAP[pkg] || [];
        const matching = entries.filter((e) => {
          const norm = e.toLowerCase().replace(/[-_]/g, '');
          if (norm.startsWith(pkgNorm)) return true;
          return extraDirs.some((dir) => e === dir || e.startsWith(dir));
        });
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
  }
}
