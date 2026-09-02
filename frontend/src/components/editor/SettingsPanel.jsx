export function SettingsPanel({ project, onAutoSaveChange, onFontSizeChange }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <div className="text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">Settings</div>
      <div className="mt-3 space-y-4 text-sm">
        <label className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2">
          <span>Autosave</span>
          <input type="checkbox" checked={project?.settings.autoSave ?? true} onChange={(event) => onAutoSaveChange(event.target.checked)} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2">
          <span>Font size</span>
          <input type="range" min="12" max="20" value={project?.settings.fontSize ?? 14} onChange={(event) => onFontSizeChange(Number(event.target.value))} />
        </label>
        <div className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-muted)]">
          Current language: {project?.language ?? 'python'}
        </div>
      </div>
    </div>
  );
}
