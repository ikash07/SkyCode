import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Trash2, Play, Square, Terminal as TerminalIcon } from 'lucide-react';

export const TerminalPanel = forwardRef(function TerminalPanel(
  {
    stdout,
    stderr,
    command,
    status,
    executionStdin,
    durationMs = 0,
    exitCode = 0,
    stdin,
    onStdinChange,
    onRun,
    busy,
    projectId,
    activeFile,
    language,
    onLiveStreamChange
  },
  ref
) {
  const [terminalInput, setTerminalInput] = useState('');
  const [history, setHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);

  // Helper to append a chunk to history buffer
  const appendChunk = (chunk, type = 'stdout') => {
    setHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].type === type) {
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
      }
      return [...prev, { type, content: chunk }];
    });
  };

  // Clear terminal helper
  const handleClear = () => {
    setHistory([]);
    onStdinChange('');
    if (onLiveStreamChange) {
      onLiveStreamChange({ stdout: '', stderr: '' });
    }
  };

  // Connect WebSocket for real-time interactive process streaming
  const startInteractiveExecution = () => {
    if (!projectId || !activeFile) {
      if (onRun) onRun(stdin);
      return;
    }

    // Close any previous socket connection
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    // Reset live stream buffer for new execution
    let currentStdout = '';
    let currentStderr = '';
    if (onLiveStreamChange) {
      onLiveStreamChange({ stdout: '', stderr: '' });
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname || 'localhost';
    const wsUrl = `${wsProtocol}//${wsHost}:4000/ws/terminal`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsRunning(true);
        ws.send(JSON.stringify({
          type: 'start',
          projectId,
          entryFile: activeFile,
          language
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'started') {
            setHistory((prev) => [...prev, { type: 'command', content: `PS C:\\SkyCode> ${msg.command}\n` }]);
          } else if (msg.type === 'stdout') {
            appendChunk(msg.data, 'stdout');
            currentStdout += msg.data;
            if (onLiveStreamChange) {
              onLiveStreamChange({ stdout: currentStdout, stderr: currentStderr });
            }
          } else if (msg.type === 'stderr') {
            appendChunk(msg.data, 'stderr');
            currentStderr += msg.data;
            if (onLiveStreamChange) {
              onLiveStreamChange({ stdout: currentStdout, stderr: currentStderr });
            }
          } else if (msg.type === 'exit') {
            setIsRunning(false);
            const seconds = (msg.durationMs / 1000).toFixed(2);
            setHistory((prev) => [
              ...prev,
              { type: 'info', content: `\n[Done] exited with code=${msg.exitCode} in ${seconds}s` },
              { type: 'prompt', content: 'PS C:\\SkyCode>' }
            ]);
            ws.close();
            socketRef.current = null;
          } else if (msg.type === 'error') {
            appendChunk(`\nError: ${msg.message}\n`, 'stderr');
            currentStderr += `\nError: ${msg.message}\n`;
            if (onLiveStreamChange) {
              onLiveStreamChange({ stdout: currentStdout, stderr: currentStderr });
            }
            setIsRunning(false);
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        setIsRunning(false);
        if (onRun) onRun(stdin);
      };

      ws.onclose = () => {
        setIsRunning(false);
      };
    } catch {
      setIsRunning(false);
      if (onRun) onRun(stdin);
    }
  };

  const stopExecution = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'stop' }));
    }
    setIsRunning(false);
  };

  useImperativeHandle(ref, () => ({
    startInteractiveExecution,
    stopExecution,
    clearTerminal: handleClear
  }));

  // Scroll to bottom and auto-focus terminal input prompt
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [history, terminalInput, busy, isRunning]);

  const handleKeyDown = (e) => {
    // Ctrl+L or Cmd+L shortcut to clear terminal
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      handleClear();
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const rawValue = terminalInput;
      const trimmed = rawValue.trim().toLowerCase();
      setTerminalInput('');

      // Check if command typed is 'clear' or 'cls'
      if (trimmed === 'clear' || trimmed === 'cls') {
        handleClear();
        return;
      }

      // Render typed input immediately into live terminal stream
      appendChunk(`${rawValue}\n`, 'stdin');

      // Send keyboard input directly to process stdin via WebSocket
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'stdin', data: `${rawValue}\n` }));
      } else {
        // Fallback HTTP run
        const nextStdin = stdin ? `${stdin}\n${rawValue}` : rawValue;
        onStdinChange(nextStdin);
        if (onRun) onRun(nextStdin);
      }
    }
  };

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const activeBusy = busy || isRunning;

  return (
    <div
      onClick={handleContainerClick}
      className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[#0d1117] font-mono text-xs text-[#c9d1d9] selection:bg-[#1f6feb]/40 cursor-text overflow-hidden shadow-inner"
    >
      {/* VS Code Style Minimal Top Bar */}
      <div className="flex items-center justify-between border-b border-[#21262d] bg-[#161b22] px-3 py-1.5 select-none shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <TerminalIcon size={13} className="text-[#8b949e]" />
          <span className="font-sans text-[11px] font-semibold tracking-wider text-[#8b949e] uppercase">Terminal</span>
          {activeBusy ? (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-sans">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              Running...
            </span>
          ) : status && status !== 'idle' ? (
            <span className={`text-[10px] font-sans px-1.5 py-0.2 rounded font-medium ${status === 'success' ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
              {status}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {activeBusy ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopExecution();
              }}
              title="Stop Execution (SIGKILL)"
              className="flex items-center gap-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 px-2 py-0.5 text-xs font-sans font-medium transition-colors"
            >
              <Square size={11} className="fill-rose-400" />
              <span className="font-sans text-[11px]">Stop</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                startInteractiveExecution();
              }}
              disabled={activeBusy}
              title="Run Code (Live Interactive)"
              className="flex items-center gap-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2 py-0.5 text-xs font-sans font-medium transition-colors disabled:opacity-40"
            >
              <Play size={12} className="text-emerald-400 fill-emerald-400" />
              <span className="font-sans text-[11px]">Run</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            title="Clear Terminal (Ctrl+L or type 'clear' / 'cls')"
            className="flex items-center gap-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white px-2 py-0.5 transition-colors"
          >
            <Trash2 size={12} />
            <span className="font-sans text-[11px]">Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
        {history.length === 0 && !activeBusy && (
          <div className="text-[#484f58] italic select-none mb-1">
            SkyCode Terminal v1.0. Click Run or type input below.
          </div>
        )}

        {history.map((entry, idx) => {
          if (entry.type === 'command') {
            return (
              <div key={idx} className="text-[#58a6ff] font-semibold select-none">
                {entry.content}
              </div>
            );
          }
          if (entry.type === 'stdin') {
            return (
              <span key={idx} className="text-[#3fb950] font-semibold whitespace-pre-wrap">
                {entry.content}
              </span>
            );
          }
          if (entry.type === 'info') {
            return (
              <div key={idx} className="my-1 font-sans text-[11px] text-[#8b949e] select-none">
                {entry.content}
              </div>
            );
          }
          if (entry.type === 'prompt') {
            return (
              <div key={idx} className="text-[#58a6ff] font-semibold select-none">
                {entry.content}
              </div>
            );
          }
          if (entry.type === 'stderr') {
            return (
              <span key={idx} className="text-[#f85149] whitespace-pre-wrap">
                {entry.content}
              </span>
            );
          }
          return (
            <span key={idx} className="text-[#c9d1d9] whitespace-pre-wrap">
              {entry.content}
            </span>
          );
        })}

        {/* Live Interactive Cursor & Input Prompt Line */}
        <div className="inline-flex items-center gap-1 text-[#c9d1d9] w-full">
          <textarea
            ref={inputRef}
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isRunning && busy}
            autoFocus
            rows={1}
            spellCheck={false}
            autoComplete="off"
            placeholder={history.length === 0 && !isRunning ? "PS C:\\SkyCode>" : ""}
            className="w-full border-none bg-transparent p-0 font-mono text-xs text-[#c9d1d9] placeholder:text-[#484f58] focus:outline-none focus:ring-0 caret-emerald-400 resize-none overflow-hidden"
          />
        </div>
      </div>
    </div>
  );
});
