import { memo } from 'react';
import { X, FileCode, FileText } from 'lucide-react';

export const FileTabs = memo(function FileTabs({ openFiles, activeFile, onSelect, onClose }) {
  if (openFiles.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
      {openFiles.map((filePath) => {
        const fileName = filePath.split('/').pop();
        const isSelected = activeFile === filePath;
        const lower = fileName.toLowerCase();
        const isCode =
          lower.endsWith('.py') ||
          lower.endsWith('.js') ||
          lower.endsWith('.c') ||
          lower.endsWith('.java');

        return (
          <button
            key={filePath}
            onClick={() => onSelect(filePath)}
            className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide shrink-0 nb-tab-anim active:translate-x-[1px] active:translate-y-[1px]"
            style={{
              background: isSelected ? '#FFD93D' : 'var(--color-panel)',
              border: isSelected ? '2px solid #000' : '2px solid var(--color-border)',
              boxShadow: isSelected ? '3px 3px 0px 0px #000' : '2px 2px 0px 0px var(--color-border)',
              color: isSelected ? '#000' : 'var(--color-muted)',
              transform: isSelected ? 'translate(-1px, -1px)' : 'none',
              transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {isCode
              ? <FileCode size={13} strokeWidth={3} />
              : <FileText size={13} strokeWidth={3} />}
            <span className="max-w-[140px] truncate">{fileName}</span>
            <span
              role="button"
              tabIndex={0}
              aria-label={`Close ${fileName}`}
              onClick={(e) => { e.stopPropagation(); onClose(filePath); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onClose(filePath))}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{ color: 'var(--color-muted)' }}
            >
              <X size={12} strokeWidth={3} />
            </span>
          </button>
        );
      })}
    </div>
  );
});
