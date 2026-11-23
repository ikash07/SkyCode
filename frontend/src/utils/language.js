export function detectLanguageFromPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return 'python';
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.c') || lower.endsWith('.h')) return 'c';
  if (lower.endsWith('.java')) return 'java';
  if (
    lower.endsWith('.js') ||
    lower.endsWith('.jsx') ||
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.mjs') ||
    lower.endsWith('.cjs')
  ) return 'javascript';
  return 'python';
}

export function editorLanguage(filePath) {
  if (!filePath || typeof filePath !== 'string') return 'plaintext';
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.c') || lower.endsWith('.h')) return 'c';
  if (lower.endsWith('.java')) return 'java';
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return 'javascript';
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.xml')) return 'xml';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml';
  if (lower.endsWith('.sh') || lower.endsWith('.bash')) return 'shell';
  if (lower.endsWith('.sql')) return 'sql';
  return 'plaintext';
}

export function guessEntryFile(tree, language) {
  const preferred =
    language === 'python'
      ? ['main.py', 'app.py']
      : language === 'c'
        ? ['main.c', 'program.c']
        : language === 'javascript'
          ? ['index.js', 'main.js', 'app.js']
          : ['Main.java', 'App.java'];

  const filePaths = [];

  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.type === 'file') {
        filePaths.push(node.path);
      } else if (node.children) {
        walk(node.children);
      }
    }
  };

  walk(tree);

  for (const filename of preferred) {
    const match = filePaths.find((filePath) => filePath.split('/').pop() === filename);
    if (match) return match;
  }

  return filePaths[0] ?? null;
}
