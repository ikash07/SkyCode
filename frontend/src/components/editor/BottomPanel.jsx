import { forwardRef, useState } from 'react';
import { Terminal, AlertTriangle, FileOutput } from 'lucide-react';
import { TerminalPanel } from './TerminalPanel';

export const BottomPanel = forwardRef(function BottomPanel(
  { activeTab, onTabChange, latestExecution, stdin, onStdinChange, onRun, busy, projectId, activeFile, language },
  ref
) {
  const [liveStream, setLiveStream] = useState({ stdout: '', stderr: '' });

  const command = latestExecution?.command ?? '';
  const status = latestExecution?.status ?? 'idle';
  const executionStdin = latestExecution?.stdin ?? '';
  const durationMs = latestExecution?.durationMs ?? 0;
  const exitCode = latestExecution?.exitCode ?? 0;

  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-1.5 border border-[var(--color-border)]">
      {/* Panel Tab Header */}
      <div className="mb-1 flex items-center gap-1 border-b border-[var(--color-border)] px-1 pb-1 text-xs shrink-0 select-none">
        <button
          onClick={() => onTabChange('terminal')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition ${
            activeTab === 'terminal'
              ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <Terminal size={14} />
          Terminal
        </button>
        <button
          onClick={() => onTabChange('output')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition ${
            activeTab === 'output'
              ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <FileOutput size={14} />
          Output
        </button>
        <button
          onClick={() => onTabChange('problems')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider uppercase transition ${
            activeTab === 'problems'
              ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
          }`}
        >
          <AlertTriangle size={14} />
          Problems
        </button>
      </div>

      <div className="min-h-0 flex-1 relative">
        <div className={`h-full w-full ${activeTab === 'terminal' ? 'block' : 'hidden'}`}>
          <TerminalPanel
            ref={ref}
            stdout={liveStream.stdout}
            stderr={liveStream.stderr}
            command={command}
            status={status}
            executionStdin={executionStdin}
            durationMs={durationMs}
            exitCode={exitCode}
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
        <div className={`h-full w-full ${activeTab === 'output' ? 'block' : 'hidden'}`}>
          <pre className="h-full overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d1117] p-3.5 text-xs md:text-sm font-mono text-[#c9d1d9] whitespace-pre-wrap">
            {liveStream.stdout || 'Run a file to see raw output stream.'}
          </pre>
        </div>
        <div className={`h-full w-full ${activeTab === 'problems' ? 'block' : 'hidden'}`}>
          <pre className="h-full overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d1117] p-3.5 text-xs md:text-sm font-mono text-[#f85149] whitespace-pre-wrap">
            {liveStream.stderr || 'No problems reported.'}
          </pre>
        </div>
      </div>
    </div>
  );
});
