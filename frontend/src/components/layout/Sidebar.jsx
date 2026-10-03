import { LayoutGrid, FolderOpen, Search, Settings, Play, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const items = [
  { view: 'explorer',  icon: FolderOpen,   label: 'Explorer' },
  { view: 'search',    icon: Search,        label: 'Search' },
  { view: 'settings',  icon: Settings,      label: 'Settings' },
];

export function Sidebar({ active, onChange, onRun, isTerminalVisible, onToggleTerminal }) {
  const navigate = useNavigate();

  const handleNav = (view) => {
    if (view === 'dashboard') navigate('/');
    else onChange(view);
  };

  return (
    <aside
      className="flex h-auto w-full md:h-full md:w-[58px] flex-row md:flex-col items-center justify-between p-2 md:py-3 shrink-0"
      style={{
        background: 'var(--color-panel)',
        border: '3px solid var(--color-border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Nav items */}
      <nav className="flex flex-row md:flex-col gap-2">
        {/* Dashboard home */}
        <button
          title="Dashboard"
          aria-label="Dashboard"
          onClick={() => handleNav('dashboard')}
          className="nb-btn-icon"
          style={{ background: 'var(--color-canvas)' }}
        >
          <LayoutGrid size={18} strokeWidth={3} />
        </button>

        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.view;
          return (
            <button
              key={item.view}
              title={item.label}
              aria-label={item.label}
              onClick={() => handleNav(item.view)}
              className="nb-btn-icon"
              style={
                isActive
                  ? {
                      background: '#FFD93D',
                      color: '#000',
                      boxShadow: 'var(--shadow-sm)',
                    }
                  : {}
              }
            >
              <Icon size={18} strokeWidth={3} />
            </button>
          );
        })}

        {/* Terminal Toggle Button in Sidebar */}
        <button
          id="sidebar-terminal-btn"
          title={isTerminalVisible ? "Hide Terminal" : "Show Terminal"}
          aria-label="Terminal"
          onClick={onToggleTerminal}
          className="nb-btn-icon"
          style={
            isTerminalVisible
              ? {
                  background: '#6BCB77',
                  color: '#000',
                  boxShadow: 'var(--shadow-sm)',
                }
              : {
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                }
          }
        >
          <Terminal size={18} strokeWidth={3} />
        </button>
      </nav>

      {/* Run Button */}
      <button
        id="sidebar-run-btn"
        title="Run Project"
        aria-label="Run Project"
        onClick={onRun}
        className="nb-btn"
        style={{
          width: 42,
          height: 42,
          padding: 0,
          background: 'var(--color-accent)',
        }}
      >
        <Play size={18} strokeWidth={3} className="fill-white ml-0.5" />
      </button>
    </aside>
  );
}
