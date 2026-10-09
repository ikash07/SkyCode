export function SettingsPanel({ project, onAutoSaveChange, onFontSizeChange }) {
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
          background: '#FF6B6B',
          borderBottom: '3px solid var(--color-border)',
        }}
      >
        <span className="text-xs font-black uppercase tracking-widest text-white">Settings</span>
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* Autosave toggle */}
        <label
          className="flex items-center justify-between px-3 py-3 cursor-pointer"
          style={{
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            boxShadow: '3px 3px 0px 0px var(--color-border)',
          }}
        >
          <span className="text-xs font-black uppercase tracking-wide" style={{ color: 'var(--color-text)' }}>
            Autosave
          </span>
          <input
            type="checkbox"
            checked={project?.settings?.autoSave ?? true}
            onChange={(e) => onAutoSaveChange(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#FF6B6B', cursor: 'pointer' }}
          />
        </label>

        {/* Font size */}
        <div
          className="px-3 py-3"
          style={{
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            boxShadow: '3px 3px 0px 0px var(--color-border)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wide" style={{ color: 'var(--color-text)' }}>
              Font Size
            </span>
            <span
              className="text-xs font-black"
              style={{
                background: '#FFD93D',
                border: '2px solid #000',
                padding: '1px 6px',
                color: '#000',
              }}
            >
              {project?.settings?.fontSize ?? 14}px
            </span>
          </div>
          <input
            type="range"
            min="12"
            max="20"
            value={project?.settings?.fontSize ?? 14}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#FF6B6B' }}
          />
        </div>

        {/* Language info */}
        <div
          className="px-3 py-3"
          style={{
            background: 'var(--color-surface)',
            border: '2px solid var(--color-border)',
            boxShadow: '3px 3px 0px 0px var(--color-border)',
          }}
        >
          <span className="nb-label block mb-1">Language</span>
          <span
            className="text-xs font-black uppercase tracking-wider"
            style={{
              background: '#C4B5FD',
              border: '2px solid #000',
              padding: '2px 8px',
              color: '#000',
              display: 'inline-block',
            }}
          >
            {project?.language ?? 'python'}
          </span>
        </div>

        {/* Brand footer */}
        <div
          className="mt-4 p-4 text-center flex flex-col items-center"
          style={{
            background: '#280736',
            border: '2px solid var(--color-border)',
            boxShadow: '3px 3px 0px 0px var(--color-border)',
          }}
        >
          <img
            src="/logo-card.png"
            alt="SkyCode"
            className="w-28 object-contain mb-2"
          />
          <div className="text-xs font-black uppercase tracking-wider text-white">
            SkyCode Online IDE
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#FFD93D] mt-0.5">
            Docker Cloud Engine
          </div>
        </div>
      </div>
    </div>
  );
}
