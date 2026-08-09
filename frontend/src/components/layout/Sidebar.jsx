import { FileText, Search, Settings, FolderOpen, Play } from 'lucide-react';

const items = [
  { view: 'explorer', icon: <FolderOpen size={18} />, label: 'Explorer' },
  { view: 'search', icon: <Search size={18} />, label: 'Search' },
  { view: 'settings', icon: <Settings size={18} />, label: 'Settings' }
];

export function Sidebar({ active, onChange, onRun }) {
  return (
    <aside className="glass-panel shell-shadow flex h-full w-[64px] flex-col items-center rounded-3xl py-3">
      <div className="mb-3 rounded-2xl bg-[var(--color-accent-soft)] p-2 text-[var(--color-accent)]">
        <FileText size={18} />
      </div>
      <nav className="flex flex-1 flex-col gap-2">
        {items.map((item) => (
          <button
            key={item.view}
            title={item.label}
            onClick={() => onChange(item.view)}
            className={`rounded-2xl p-3 transition ${active === item.view ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'text-[var(--color-muted)] hover:bg-white/5 hover:text-[var(--color-text)]'}`}
          >
            {item.icon}
          </button>
        ))}
      </nav>
      <button
        title="Run"
        onClick={onRun}
        className="mb-2 rounded-2xl bg-[var(--color-accent)] p-3 text-white shadow-lg shadow-blue-500/20 transition hover:scale-105"
      >
        <Play size={18} />
      </button>
    </aside>
  );
}
