import { ChevronDown, ChevronRight, FilePlus2, FolderPlus, Pencil, Trash2, Upload, MoreHorizontal, Terminal } from 'lucide-react';
import { useMemo, useState } from 'react';

function TreeRow({ node, activeFile, onOpen, onRename, onDelete }) {
  const [expanded, setExpanded] = useState(true);

  if (node.type === 'directory') {
    return (
      <div className="pl-1">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="group flex w-full items-center justify-between gap-1.5 px-2.5 py-1.5 text-left text-sm font-bold transition-colors duration-100"
          style={{ color: 'var(--color-text)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="flex items-center gap-1.5 truncate">
            {expanded
              ? <ChevronDown size={14} strokeWidth={3} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />
              : <ChevronRight size={14} strokeWidth={3} style={{ color: 'var(--color-muted)', flexShrink: 0 }} />}
            <span className="truncate uppercase text-xs tracking-wide">{node.name || 'root'}</span>
          </span>
          <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); onRename(node.path); }}
              style={{ padding: 3 }}
              title="Rename"
            >
              <Pencil size={12} strokeWidth={3} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(node.path); }}
              style={{ padding: 3 }}
              title="Delete"
            >
              <Trash2 size={12} strokeWidth={3} />
            </button>
          </span>
        </button>
        {expanded && node.children?.length ? (
          <div
            className="ml-3 pl-2 space-y-0.5"
            style={{ borderLeft: '2px solid var(--color-border)' }}
          >
            {node.children.map((child) => (
              <TreeRow
                key={child.path || child.name}
                node={child}
                activeFile={activeFile}
                onOpen={onOpen}
                onRename={onRename}
                onDelete={onDelete}
              />
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
      className="group flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs font-bold uppercase tracking-wide transition-all duration-100"
      style={
        selected
          ? {
              background: '#FFD93D',
              color: '#000',
              border: '2px solid #000',
              boxShadow: '3px 3px 0px 0px #000',
              transform: 'translate(-1px,-1px)',
            }
          : { color: 'var(--color-text)' }
      }
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--color-surface)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <span className="truncate">{node.name}</span>
      <span className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 shrink-0">
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onRename(node.path); }}
          style={{ padding: 3 }}
          title="Rename"
        >
          <Pencil size={11} strokeWidth={3} />
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onDelete(node.path); }}
          style={{ padding: 3, color: '#FF6B6B' }}
          title="Delete"
        >
          <Trash2 size={11} strokeWidth={3} />
        </span>
      </span>
    </button>
  );
}

export function Explorer({
  tree,
  activeFile,
  onOpen,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onUpload,
  onToggleTerminal,
}) {
  const nodes = useMemo(() => tree, [tree]);

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background: 'var(--color-panel)',
        border: '3px solid var(--color-border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 shrink-0"
        style={{
          background: '#C4B5FD',
          borderBottom: '3px solid var(--color-border)',
        }}
      >
        <span className="text-xs font-black uppercase tracking-widest text-black">Explorer</span>
        <div className="flex items-center gap-1">
          {[
            { icon: FilePlus2,    label: 'New File',   onClick: onCreateFile },
            { icon: FolderPlus,   label: 'New Folder', onClick: onCreateFolder },
            { icon: Upload,       label: 'Upload',     onClick: onUpload },
            { icon: Terminal,     label: 'Terminal',   onClick: onToggleTerminal },
            { icon: MoreHorizontal, label: 'More',     onClick: undefined },
          ].map(({ icon: Icon, label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              title={label}
              aria-label={label}
              className="flex items-center justify-center"
              style={{
                width: 26, height: 26,
                background: 'rgba(0,0,0,0.08)',
                border: '2px solid #000',
                cursor: 'pointer',
                color: '#000',
              }}
            >
              <Icon size={13} strokeWidth={3} />
            </button>
          ))}
        </div>
      </div>

      {/* Label */}
      <div className="px-3 pt-2.5 pb-1 shrink-0">
        <span className="nb-label">Project Files</span>
      </div>

      {/* File Tree */}
      <div className="flex-1 overflow-y-auto px-1 pb-2 space-y-0.5">
        {nodes.length ? (
          nodes.map((node) => (
            <TreeRow
              key={node.path || node.name}
              node={node}
              activeFile={activeFile}
              onOpen={onOpen}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))
        ) : (
          <div
            className="m-3 p-4 text-xs font-bold text-center"
            style={{
              border: '2px dashed var(--color-border)',
              color: 'var(--color-muted)',
            }}
          >
            Project is empty.<br />Create a file to begin.
          </div>
        )}
      </div>

      {/* Status bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 shrink-0"
        style={{ borderTop: '3px solid var(--color-border)' }}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
          Synced
        </span>
      </div>
    </div>
  );
}
