import { Search } from 'lucide-react';

export function SearchPanel({ query, results, onQueryChange, onSearch, onOpenFile }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-black/10 p-3">
      <div className="mb-3">
        <div className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">Search</div>
        <div className="mt-2 flex gap-2">
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onSearch()}
            placeholder="Search files or content"
            className="w-full rounded-xl border border-[var(--color-border)] bg-black/10 px-3 py-2 text-sm outline-none placeholder:text-[var(--color-muted)]"
          />
          <button onClick={onSearch} className="rounded-xl bg-[var(--color-accent)] px-3 py-2 text-white"><Search size={16} /></button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {results.length ? results.map((result) => (
          <button key={result.path} onClick={() => onOpenFile(result.path)} className="w-full rounded-xl border border-[var(--color-border)] bg-black/10 p-3 text-left hover:border-[var(--color-accent)]">
            <div className="text-sm font-medium">{result.path}</div>
            <div className="mt-1 space-y-1 text-xs text-[var(--color-muted)]">
              {result.matches.map((line, index) => <div key={`${result.path}-${index}`}>{line}</div>)}
            </div>
          </button>
        )) : <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-muted)]">Search results will appear here.</div>}
      </div>
    </div>
  );
}
