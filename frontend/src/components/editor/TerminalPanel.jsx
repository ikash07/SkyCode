import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Trash2, Play, Square } from 'lucide-react';

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

  const appendChunk = (chunk, type = 'stdout') => {
    setHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].type === type) {
        const last = prev[prev.length - 1];
        return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
      }
      return [...prev, { type, content: chunk }];
    });
  };

  const handleClear = () => {
    setHistory([]);
    onStdinChange('');
    if (onLiveStreamChange) {
      onLiveStreamChange({ stdout: '', stderr: '' });
    }
  };

  const startInteractiveExecution = () => {
    if (!projectId || !activeFile) {
      if (onRun) onRun(stdin);
      return;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

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
            setHistory((prev) => [...prev, { type: 'command', content: `$ python ${activeFile}\nINFO: Started server process\n` }]);
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
              { type: 'prompt', content: 'skycode@workspace:~/my-app$ ' }
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
          // Ignore
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

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [history, terminalInput, busy, isRunning]);

  const handleKeyDown = (e) => {
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

      if (trimmed === 'clear' || trimmed === 'cls') {
        handleClear();
        return;
      }

      appendChunk(`${rawValue}\n`, 'stdin');

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: 'stdin', data: `${rawValue}\n` }));
      } else {
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
      className="flex h-full flex-col rounded-xl border border-[#21262d] bg-[#090d16] font-mono text-xs md:text-sm text-[#c9d1d9] selection:bg-[#1f6feb]/40 cursor-text overflow-hidden shadow-inner"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-[#21262d] bg-[#0d1322] px-3 py-1.5 select-none shrink-0 text-xs md:text-sm font-sans font-semibold">
        <div className="flex items-center gap-2">
          {activeBusy ? (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-sans font-bold">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Running
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-[#8b949e] font-sans font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Ready
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeBusy ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopExecution();
              }}
              title="Stop Execution"
              className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-1 text-xs font-sans font-bold transition-colors"
            >
              <Square size={12} className="fill-rose-400" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                startInteractiveExecution();
              }}
              disabled={activeBusy}
              title="Run Code"
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-[#4f8cff] to-[#7c3aed] text-white px-3 py-1 text-xs font-sans font-bold transition-opacity disabled:opacity-40 shadow"
            >
              <Play size={12} className="fill-white" />
              <span>Run</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            title="Clear Terminal"
            className="flex items-center gap-1.5 rounded-lg border border-[#21262d] bg-[#161b22] hover:bg-[#21262d] text-[#8b949e] hover:text-white px-3 py-1 text-xs font-sans transition-colors"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Terminal Viewport */}
      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs md:text-sm leading-relaxed">
        {history.length === 0 && !activeBusy && (
          <div className="text-[#484f58] italic select-none mb-1 text-xs md:text-sm">
            SkyCode Terminal v1.0. Click Run or type input below.
          </div>
        )}

        {history.map((entry, idx) => {
          if (entry.type === 'command') {
            return (
              <div key={idx} className="text-[#58a6ff] font-bold select-none">
                {entry.content}
              </div>
            );
          }
          if (entry.type === 'stdin') {
            return (
              <span key={idx} className="text-[#3fb950] font-bold whitespace-pre-wrap">
                {entry.content}
              </span>
            );
          }
          if (entry.type === 'info') {
            return (
              <div key={idx} className="my-1 font-sans text-xs text-[#8b949e] select-none">
                {entry.content}
              </div>
            );
          }
          if (entry.type === 'prompt') {
            return (
              <div key={idx} className="text-[#58a6ff] font-bold select-none">
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
            placeholder={history.length === 0 && !isRunning ? "skycode@workspace:~/my-app$ " : ""}
            className="w-full border-none bg-transparent p-0 font-mono text-xs md:text-sm text-[#c9d1d9] placeholder:text-[#484f58] focus:outline-none focus:ring-0 caret-emerald-400 resize-none overflow-hidden"
          />
        </div>
      </div>
    </div>
  );
});
