import { ChevronDown, ChevronRight, FilePlus2, FolderPlus, Pencil, Trash2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TreeNode } from '../../types/api';

interface ExplorerProps {
  tree: TreeNode[];
  activeFile: string | null;
  onOpen: (filePath: string) => void;
  onCreateFile: () => void;
  onCreateFolder: () => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
  onUpload: () => void;
}

function TreeRow({ node, activeFile, onOpen, onRename, onDelete }: { node: TreeNode; activeFile: string | null; onOpen: (filePath: string) => void; onRename: (path: string) => void; onDelete: (path: string) => void; }) {
  const [expanded, setExpanded] = useState(true);

  if (node.type === 'directory') {
    return (
      <div className="pl-2">
        <button
          onClick={() => setExpanded((value) => !value)}
          className="group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-sm text-[var(--color-text)] hover:bg-white/5"
        >
          <span className="flex items-center gap-1">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="truncate">{node.name || 'root'}</span>
          </span>
          <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
            <button onClick={(event) => { event.stopPropagation(); onRename(node.path); }} className="rounded p-1 hover:bg-white/10"><Pencil size={12} /></button>
            <button onClick={(event) => { event.stopPropagation(); onDelete(node.path); }} className="rounded p-1 hover:bg-white/10"><Trash2 size={12} /></button>
          </span>
        </button>
        {expanded && node.children?.length ? (
          <div className="ml-3 border-l border-[var(--color-border)] pl-2">
            {node.children.map((child) => (
              <TreeRow key={child.path || child.name} node={child} activeFile={activeFile} onOpen={onOpen} onRename={onRename} onDelete={onDelete} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const selected = activeFile === node.path;
  return (
    <button
      onClick={() => onOpen(node.path)}
      className={`group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-sm transition ${selected ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'text-[var(--color-text)] hover:bg-white/5'}`}
    >
      <span className="truncate">{node.name}</span>
      <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <button onClick={(event) => { event.stopPropagation(); onRename(node.path); }} className="rounded p-1 hover:bg-white/10"><Pencil size={12} /></button>
        <button onClick={(event) => { event.stopPropagation(); onDelete(node.path); }} className="rounded p-1 hover:bg-white/10"><Trash2 size={12} /></button>
      </span>
    </button>
  );
}

export function Explorer({ tree, activeFile, onOpen, onCreateFile, onCreateFolder, onRename, onDelete, onUpload }: ExplorerProps) {
  const nodes = useMemo(() => tree, [tree]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-black/10 p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">Explorer</div>
          <div className="text-sm font-semibold">Project files</div>
        </div>
        <div className="flex items-center gap-1 text-[var(--color-muted)]">
          <button onClick={onCreateFile} className="rounded-lg p-2 hover:bg-white/10" title="New File"><FilePlus2 size={16} /></button>
          <button onClick={onCreateFolder} className="rounded-lg p-2 hover:bg-white/10" title="New Folder"><FolderPlus size={16} /></button>
          <button onClick={onUpload} className="rounded-lg p-2 hover:bg-white/10" title="Upload"><Upload size={16} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-1">
        {nodes.length ? nodes.map((node) => <TreeRow key={node.path || node.name} node={node} activeFile={activeFile} onOpen={onOpen} onRename={onRename} onDelete={onDelete} />) : <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">This project is empty. Create files to begin.</div>}
      </div>
    </div>
  );
}
