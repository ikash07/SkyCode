export function detectLanguageFromPath(filePath) {
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.c')) return 'c';
  if (filePath.endsWith('.java')) return 'java';
  if (
    filePath.endsWith('.js') ||
    filePath.endsWith('.jsx') ||
    filePath.endsWith('.ts') ||
    filePath.endsWith('.tsx') ||
    filePath.endsWith('.mjs') ||
    filePath.endsWith('.cjs')
  ) return 'javascript';
  return 'python';
}

export function editorLanguage(filePath) {
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.c') || filePath.endsWith('.h')) return 'c';
  if (filePath.endsWith('.java')) return 'java';
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) return 'javascript';
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.html') || filePath.endsWith('.htm')) return 'html';
  if (filePath.endsWith('.css')) return 'css';
  if (filePath.endsWith('.md')) return 'markdown';
  if (filePath.endsWith('.xml')) return 'xml';
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) return 'yaml';
  if (filePath.endsWith('.sh') || filePath.endsWith('.bash')) return 'shell';
  if (filePath.endsWith('.sql')) return 'sql';
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
