import { Search } from 'lucide-react';

export function SearchPanel({ query, results, onQueryChange, onSearch, onOpenFile }) {
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
        className="flex items-center gap-2 px-3 py-2.5 shrink-0"
        style={{
          background: '#FFD93D',
          borderBottom: '3px solid var(--color-border)',
        }}
      >
        <Search size={15} strokeWidth={3} color="#000" />
        <span className="text-xs font-black uppercase tracking-widest text-black">Search</span>
      </div>

      {/* Search input */}
      <div className="p-3 shrink-0" style={{ borderBottom: '2px solid var(--color-border)' }}>
        <div className="flex gap-2">
          <input
            id="search-panel-input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Search files or content…"
            className="nb-input"
            style={{ fontSize: '0.8rem', height: 38 }}
          />
          <button
            id="search-panel-btn"
            onClick={onSearch}
            className="nb-btn"
            style={{ height: 38, padding: '0 14px', flexShrink: 0 }}
            aria-label="Search"
          >
            <Search size={15} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {results.length ? (
          results.map((result) => (
            <button
              key={result.path}
              onClick={() => onOpenFile(result.path)}
              className="w-full p-3 text-left transition-colors duration-100"
              style={{
                background: 'var(--color-surface)',
                border: '2px solid var(--color-border)',
                boxShadow: '3px 3px 0px 0px var(--color-border)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#FFD93D')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-surface)')}
            >
              <div className="text-xs font-black uppercase tracking-wide" style={{ color: 'var(--color-text)' }}>
                {result.path}
              </div>
              <div className="mt-1 space-y-0.5">
                {result.matches.map((line, i) => (
                  <div key={`${result.path}-${i}`} className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>
                    {line}
                  </div>
                ))}
              </div>
            </button>
          ))
        ) : (
          <div
            className="m-1 p-4 text-xs font-bold text-center"
            style={{
              border: '2px dashed var(--color-border)',
              color: 'var(--color-muted)',
            }}
          >
            Search results appear here.
          </div>
        )}
      </div>
    </div>
  );
}
