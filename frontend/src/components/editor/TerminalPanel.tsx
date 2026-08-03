import { useMemo } from 'react';

interface TerminalPanelProps {
  stdout: string;
  stderr: string;
  command: string;
  status: string;
}

export function TerminalPanel({ stdout, stderr, command, status }: TerminalPanelProps) {
  const lines = useMemo(() => {
    const outputLines: string[] = [];
    outputLines.push(`> ${command || 'Waiting for execution...'}`);
    outputLines.push(`> ${status}`);
    if (stdout) {
      outputLines.push('');
      outputLines.push(stdout);
    }
    if (stderr) {
      outputLines.push('');
      outputLines.push(stderr);
    }
    return outputLines.join('\n');
  }, [stdout, stderr, command, status]);

  return (
    <pre className="h-full w-full overflow-auto rounded-2xl border border-[var(--color-border)] bg-black/30 p-4 text-sm whitespace-pre-wrap font-mono text-[#dce7f7]">
      {lines}
    </pre>
  );
}
