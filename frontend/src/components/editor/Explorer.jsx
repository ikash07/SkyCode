import { ChevronDown, ChevronRight, FilePlus2, FolderPlus, Pencil, Trash2, Upload, MoreHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';

function TreeRow({ node, activeFile, onOpen, onRename, onDelete }) {
  const [expanded, setExpanded] = useState(true);

  if (node.type === 'directory') {
    return (
      <div className="pl-1">
        <button
          onClick={() => setExpanded((value) => !value)}
          className="group flex w-full items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-[var(--color-text)] hover:bg-black/5 dark:hover:bg-white/5"
        >
          <span className="flex items-center gap-1.5 truncate">
            {expanded ? <ChevronDown size={15} className="text-[var(--color-muted)] shrink-0" /> : <ChevronRight size={15} className="text-[var(--color-muted)] shrink-0" />}
            <span className="truncate">{node.name || 'root'}</span>
          </span>
          <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 shrink-0">
            <button onClick={(event) => { event.stopPropagation(); onRename(node.path); }} className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10" title="Rename"><Pencil size={13} /></button>
            <button onClick={(event) => { event.stopPropagation(); onDelete(node.path); }} className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10" title="Delete"><Trash2 size={13} /></button>
          </span>
        </button>
        {expanded && node.children?.length ? (
          <div className="ml-3 border-l border-[var(--color-border)] pl-2 space-y-0.5">
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
      className={`group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
        selected
          ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-medium shadow-sm'
          : 'text-[var(--color-text)] hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <span className="truncate">{node.name}</span>
      <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 shrink-0">
        <button onClick={(event) => { event.stopPropagation(); onRename(node.path); }} className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10" title="Rename"><Pencil size={13} /></button>
        <button onClick={(event) => { event.stopPropagation(); onDelete(node.path); }} className="rounded p-1 hover:bg-black/10 dark:hover:bg-white/10" title="Delete"><Trash2 size={13} /></button>
      </span>
    </button>
  );
}

export function Explorer({ tree, activeFile, onOpen, onCreateFile, onCreateFolder, onRename, onDelete, onUpload }) {
  const nodes = useMemo(() => tree, [tree]);

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-[var(--color-border)] subtle-bg p-3.5">
      {/* Header */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs uppercase font-bold tracking-[0.25em] text-[var(--color-muted)]">Explorer</div>
          <div className="flex items-center gap-1 text-[var(--color-muted)]">
            <button onClick={onCreateFile} className="rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10" title="New File"><FilePlus2 size={17} /></button>
            <button onClick={onCreateFolder} className="rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10" title="New Folder"><FolderPlus size={17} /></button>
            <button onClick={onUpload} className="rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10" title="Upload"><Upload size={17} /></button>
            <button className="rounded-lg p-1.5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--color-muted)]" title="More Options"><MoreHorizontal size={17} /></button>
          </div>
        </div>
        <div className="mb-2.5 text-sm font-bold text-[var(--color-text)]">Project files</div>
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-0.5">
        {nodes.length ? (
          nodes.map((node) => (
            <TreeRow key={node.path || node.name} node={node} activeFile={activeFile} onOpen={onOpen} onRename={onRename} onDelete={onDelete} />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-xs md:text-sm text-[var(--color-muted)]">
            This project is empty. Create files to begin.
          </div>
        )}
      </div>

      {/* Bottom Save & Sync Status Badge */}
      <div className="mt-3 border-t border-[var(--color-border)] pt-2.5 flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
        </span>
        <div>
          <div className="font-semibold text-[var(--color-text)] leading-none text-xs">All changes saved</div>
          <div className="text-[11px] text-[var(--color-muted)] leading-tight mt-0.5">Synced just now</div>
        </div>
      </div>
    </div>
  );
}
