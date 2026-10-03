import { X, FileCode, FileText } from 'lucide-react';

export function FileTabs({ openFiles, activeFile, onSelect, onClose }) {
  if (openFiles.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
      {openFiles.map((filePath) => {
        const fileName = filePath.split('/').pop();
        const isSelected = activeFile === filePath;
        const isCode =
          fileName.endsWith('.py') ||
          fileName.endsWith('.js') ||
          fileName.endsWith('.c') ||
          fileName.endsWith('.java');

        return (
          <button
            key={filePath}
            onClick={() => onSelect(filePath)}
            className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all duration-100 shrink-0"
            style={
              isSelected
                ? {
                    background: '#FFD93D',
                    border: '2px solid #000',
                    boxShadow: '3px 3px 0px 0px #000',
                    color: '#000',
                    transform: 'translate(-1px, -1px)',
                  }
                : {
                    background: 'var(--color-panel)',
                    border: '2px solid var(--color-border)',
                    boxShadow: '2px 2px 0px 0px var(--color-border)',
                    color: 'var(--color-muted)',
                  }
            }
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
}
