export function addNodeToTree(tree, filePath, type = 'file') {
  if (!filePath) return tree || [];
  const normalized = filePath.replace(/^\/+/, '').replace(/\/+$/, '');
  const parts = normalized.split('/').filter(Boolean);
  const newTree = JSON.parse(JSON.stringify(tree || []));

  let currentLevel = newTree;
  let currentPath = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const isLeaf = i === parts.length - 1;

    let existing = currentLevel.find((node) => node.name === part);
    if (!existing) {
      existing = {
        name: part,
        path: currentPath,
        type: isLeaf ? type : 'directory',
        children: isLeaf && type === 'file' ? undefined : []
      };
      currentLevel.push(existing);
      currentLevel.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }

    if (!isLeaf) {
      if (!existing.children) existing.children = [];
      currentLevel = existing.children;
    }
  }

  return newTree;
}

export function removeNodeFromTree(tree, targetPath) {
  if (!tree) return [];
  const normalized = targetPath.replace(/^\/+/, '').replace(/\/+$/, '');
  return tree
    .filter((node) => node.path !== normalized && !node.path.startsWith(`${normalized}/`))
    .map((node) => {
      if (node.children) {
        return { ...node, children: removeNodeFromTree(node.children, normalized) };
      }
      return node;
    });
}

export function renameNodeInTree(tree, fromPath, toPath) {
  if (!tree) return [];
  const fromNorm = fromPath.replace(/^\/+/, '').replace(/\/+$/, '');
  const toNorm = toPath.replace(/^\/+/, '').replace(/\/+$/, '');
  const toName = toNorm.split('/').pop();

  return tree.map((node) => {
    let updated = { ...node };
    if (node.path === fromNorm) {
      updated.name = toName;
      updated.path = toNorm;
    } else if (node.path.startsWith(`${fromNorm}/`)) {
      updated.path = node.path.replace(fromNorm, toNorm);
    }
    if (node.children) {
      updated.children = renameNodeInTree(node.children, fromNorm, toNorm);
    }
    return updated;
  });
}
