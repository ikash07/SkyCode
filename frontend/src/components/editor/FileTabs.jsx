import { X, FileCode, FileText } from 'lucide-react';

export function FileTabs({ openFiles, activeFile, onSelect, onClose }) {
  if (openFiles.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--color-border)] px-3 py-1.5 bg-black/5 dark:bg-white/[0.02]">
      {openFiles.map((filePath) => {
        const fileName = filePath.split('/').pop();
        const isSelected = activeFile === filePath;
        const isCode = fileName.endsWith('.py') || fileName.endsWith('.js') || fileName.endsWith('.c') || fileName.endsWith('.java');

        return (
          <button
            key={filePath}
            onClick={() => onSelect(filePath)}
            className={`group flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs md:text-sm font-medium transition ${
              isSelected
                ? 'border-[var(--color-border)] bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-sm'
                : 'border-transparent text-[var(--color-muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--color-text)]'
            }`}
          >
            {isCode ? <FileCode size={15} /> : <FileText size={15} />}
            <span className="max-w-[160px] truncate">{fileName}</span>
            <span
              onClick={(event) => {
                event.stopPropagation();
                onClose(filePath);
              }}
              className="rounded p-0.5 text-[var(--color-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 hover:text-[var(--color-text)]"
              title="Close tab"
            >
              <X size={13} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
