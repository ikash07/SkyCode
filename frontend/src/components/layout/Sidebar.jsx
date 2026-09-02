import { LayoutGrid, FolderOpen, Search, Settings, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const items = [
  { view: 'dashboard', icon: <LayoutGrid size={20} />, label: 'Dashboard' },
  { view: 'explorer', icon: <FolderOpen size={20} />, label: 'Explorer' },
  { view: 'search', icon: <Search size={20} />, label: 'Search' },
  { view: 'settings', icon: <Settings size={20} />, label: 'Settings' }
];

export function Sidebar({ active, onChange, onRun }) {
  const navigate = useNavigate();

  const handleNav = (view) => {
    if (view === 'dashboard') {
      navigate('/');
    } else {
      onChange(view);
    }
  };

  return (
    <aside className="glass-panel shell-shadow flex h-auto w-full md:h-full md:w-[60px] flex-row md:flex-col items-center justify-between rounded-2xl md:rounded-3xl p-2 md:py-3 border border-[var(--color-border)] shrink-0">
      <nav className="flex flex-row md:flex-col gap-1.5 md:gap-2">
        {items.map((item) => (
          <button
            key={item.view}
            title={item.label}
            onClick={() => handleNav(item.view)}
            className={`rounded-xl md:rounded-2xl p-2.5 transition ${
              active === item.view
                ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                : 'text-[var(--color-muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--color-text)]'
            }`}
          >
            {item.icon}
          </button>
        ))}
      </nav>

      {/* Floating Gradient Circular Play Button */}
      <button
        title="Run Execution"
        onClick={onRun}
        className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#4f8cff] to-[#7c3aed] text-white shadow-lg shadow-blue-500/30 transition hover:scale-110 active:scale-95 shrink-0"
      >
        <Play size={18} className="fill-white ml-0.5" />
      </button>
    </aside>
  );
}
