import { forwardRef, useState, useRef, useImperativeHandle } from 'react';
import { Terminal, AlertTriangle, FileOutput, X, Play, Square, Trash2 } from 'lucide-react';
import { TerminalPanel } from './TerminalPanel';

const TABS = [
  { id: 'terminal',  label: 'Terminal', icon: Terminal },
  { id: 'output',    label: 'Output',   icon: FileOutput },
  { id: 'problems',  label: 'Problems', icon: AlertTriangle },
];

export const BottomPanel = forwardRef(function BottomPanel(
  { activeTab, onTabChange, latestExecution, stdin, onStdinChange, onRun, busy, projectId, activeFile, language, onHide },
  ref
) {
  const [liveStream, setLiveStream] = useState({ stdout: '', stderr: '' });
  const [isTerminalRunning, setIsTerminalRunning] = useState(false);
  const terminalPanelRef = useRef(null);

  useImperativeHandle(ref, () => ({
    startInteractiveExecution: (file) => terminalPanelRef.current?.startInteractiveExecution?.(file),
    stopExecution: () => terminalPanelRef.current?.stopExecution?.(),
    clearTerminal: () => {
      terminalPanelRef.current?.clearTerminal?.();
      setLiveStream({ stdout: '', stderr: '' });
    },
  }));

  const activeBusy = busy || isTerminalRunning;

  const handleRun = () => {
    if (activeBusy) {
      terminalPanelRef.current?.stopExecution?.();
    } else {
      terminalPanelRef.current?.startInteractiveExecution?.();
    }
  };

  const handleClear = () => {
    terminalPanelRef.current?.clearTerminal?.();
    setLiveStream({ stdout: '', stderr: '' });
  };

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: 'var(--color-panel)',
        border: '3px solid var(--color-border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* ── Unified Neo-Brutalism Panel Bar ── */}
      <div
        className="flex items-center justify-between shrink-0 px-2 py-1.5 select-none"
        style={{
          borderBottom: '3px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        {/* Left: Tab selectors */}
        <div className="flex items-center gap-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`bottom-tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-wider transition-all duration-100"
                style={
                  isActive
                    ? {
                        background: '#FFD93D',
                        color: '#000',
                        border: '2px solid #000',
                        boxShadow: '2px 2px 0px 0px #000',
                      }
                    : {
                        background: 'transparent',
                        color: 'var(--color-muted)',
                        border: '2px solid transparent',
                      }
                }
              >
                <Icon size={12} strokeWidth={2.5} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Integrated Neo-Brutalist Controls */}
        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
            style={{
              background: activeBusy ? '#FFD93D' : '#FFFDF5',
              border: '2px solid #000',
              boxShadow: '2px 2px 0px 0px #000',
              color: '#000',
            }}
          >
            <span className={`h-2 w-2 rounded-full ${activeBusy ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            {activeBusy ? 'Running' : 'Ready'}
          </div>

          {/* Run / Stop Button */}
          <button
            id="panel-run-btn"
            onClick={handleRun}
            title={activeBusy ? "Stop Process" : "Run Code (Interactive Terminal)"}
            className="flex items-center gap-1 px-3 py-1 text-xs font-black uppercase tracking-wider transition-all duration-100 active:translate-x-[1px] active:translate-y-[1px]"
            style={{
              background: activeBusy ? '#FF6B6B' : '#FFD93D',
              border: '2px solid #000',
              boxShadow: '2px 2px 0px 0px #000',
              color: activeBusy ? '#FFF' : '#000',
              cursor: 'pointer',
            }}
          >
            {activeBusy ? (
              <>
                <Square size={11} strokeWidth={3} className="fill-white" />
                Stop
              </>
            ) : (
              <>
                <Play size={11} strokeWidth={3} className="fill-black" />
                Run
              </>
            )}
          </button>

          {/* Clear Button */}
          <button
            id="panel-clear-btn"
            onClick={handleClear}
            title="Clear Terminal Output (Ctrl+L)"
            aria-label="Clear Terminal"
            className="flex items-center justify-center transition-all duration-100 active:translate-x-[1px] active:translate-y-[1px]"
            style={{
              width: 26,
              height: 26,
              background: '#FFFDF5',
              border: '2px solid #000',
              boxShadow: '2px 2px 0px 0px #000',
              color: '#000',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#FFD93D'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFDF5'; }}
          >
            <Trash2 size={13} strokeWidth={2.5} />
          </button>

          {/* Minimal Close / Hide Button */}
          {onHide && (
            <button
              id="bottom-panel-hide-btn"
              onClick={onHide}
              title="Hide Terminal (Restore anytime from Sidebar or Explorer)"
              aria-label="Hide Terminal"
              className="flex items-center justify-center transition-all duration-100 active:translate-x-[1px] active:translate-y-[1px]"
              style={{
                width: 26,
                height: 26,
                background: '#FFFDF5',
                border: '2px solid #000',
                boxShadow: '2px 2px 0px 0px #000',
                color: '#000',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FF6B6B';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFDF5';
                e.currentTarget.style.color = '#000';
              }}
            >
              <X size={14} strokeWidth={3} />
            </button>
          )}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="min-h-0 flex-1 relative bg-black">
        {/* Terminal */}
        <div className={`h-full w-full ${activeTab === 'terminal' ? 'block' : 'hidden'}`}>
          <TerminalPanel
            ref={terminalPanelRef}
            stdout={liveStream.stdout}
            stderr={liveStream.stderr}
            onRunningChange={setIsTerminalRunning}
            stdin={stdin}
            onStdinChange={onStdinChange}
            onRun={onRun}
            busy={busy}
            projectId={projectId}
            activeFile={activeFile}
            language={language}
            onLiveStreamChange={setLiveStream}
          />
        </div>

        {/* Output */}
        <div className={`h-full w-full ${activeTab === 'output' ? 'block' : 'hidden'}`}>
          <pre
            className="h-full overflow-auto p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed"
            style={{
              background: '#000000',
              color: '#FFFDF5',
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {liveStream.stdout || '// Run a file to see stdout output stream.'}
          </pre>
        </div>

        {/* Problems */}
        <div className={`h-full w-full ${activeTab === 'problems' ? 'block' : 'hidden'}`}>
          <pre
            className="h-full overflow-auto p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed"
            style={{
              background: '#000000',
              color: '#FF6B6B',
              fontFamily: "'Space Mono', monospace",
            }}
          >
            {liveStream.stderr || '// No problems or errors reported.'}
          </pre>
        </div>
      </div>
    </div>
  );
});
