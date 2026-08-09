export function detectLanguageFromPath(filePath) {
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.c')) return 'c';
  return 'java';
}

export function editorLanguage(filePath) {
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.c')) return 'c';
  if (filePath.endsWith('.java')) return 'java';
  return 'plaintext';
}

export function guessEntryFile(tree, language) {
  const preferred = language === 'python' ? ['main.py', 'app.py'] : language === 'c' ? ['main.c', 'program.c'] : ['Main.java', 'App.java'];
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
