import { Terminal, AlertTriangle, FileOutput } from 'lucide-react';
import { TerminalPanel } from './TerminalPanel';
import type { ExecutionRecord } from '../../types/api';

type BottomTab = 'terminal' | 'output' | 'problems';

interface BottomPanelProps {
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  latestExecution: ExecutionRecord | null;
}

export function BottomPanel({ activeTab, onTabChange, latestExecution }: BottomPanelProps) {
  const stdout = latestExecution?.stdout ?? '';
  const stderr = latestExecution?.stderr ?? '';
  const command = latestExecution?.command ?? '';
  const status = latestExecution?.status ?? 'idle';

  return (
    <div className="glass-panel shell-shadow h-full rounded-2xl p-2">
      <div className="mb-2 flex items-center gap-2 border-b border-[var(--color-border)] px-1 pb-2 text-sm">
        <button onClick={() => onTabChange('terminal')} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 ${activeTab === 'terminal' ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}><Terminal size={14} />Terminal</button>
        <button onClick={() => onTabChange('output')} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 ${activeTab === 'output' ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}><FileOutput size={14} />Output</button>
        <button onClick={() => onTabChange('problems')} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 ${activeTab === 'problems' ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}><AlertTriangle size={14} />Problems</button>
      </div>
      <div className="h-[calc(100%-48px)]">
        {activeTab === 'terminal' ? <TerminalPanel stdout={stdout} stderr={stderr} command={command} status={status} /> : null}
        {activeTab === 'output' ? <pre className="h-full overflow-auto rounded-2xl border border-[var(--color-border)] bg-black/30 p-4 text-sm whitespace-pre-wrap">{stdout || 'Run a file to see output.'}</pre> : null}
        {activeTab === 'problems' ? <pre className="h-full overflow-auto rounded-2xl border border-[var(--color-border)] bg-black/30 p-4 text-sm whitespace-pre-wrap text-[var(--color-danger)]">{stderr || 'No problems reported.'}</pre> : null}
      </div>
    </div>
  );
}
