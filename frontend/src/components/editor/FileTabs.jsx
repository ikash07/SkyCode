import { X } from 'lucide-react';

export function FileTabs({ openFiles, activeFile, onSelect, onClose }) {
  return (
    <div className="flex min-h-[52px] items-end gap-1 overflow-x-auto border-b border-[var(--color-border)] px-2 pt-2">
      {openFiles.map((filePath) => (
        <button
          key={filePath}
          onClick={() => onSelect(filePath)}
          className={`group flex items-center gap-2 rounded-t-xl border border-b-0 px-4 py-3 text-sm transition ${activeFile === filePath ? 'border-[var(--color-border)] bg-[var(--color-accent-soft)] text-[var(--color-text)]' : 'border-transparent text-[var(--color-muted)] hover:bg-white/5 hover:text-[var(--color-text)]'}`}
        >
          <span className="max-w-[180px] truncate">{filePath.split('/').pop()}</span>
          <span
            onClick={(event) => {
              event.stopPropagation();
              onClose(filePath);
            }}
            className="rounded p-1 text-[var(--color-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-[var(--color-text)]"
          >
            <X size={12} />
          </span>
        </button>
      ))}
    </div>
  );
}
