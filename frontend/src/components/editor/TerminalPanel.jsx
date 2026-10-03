import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

export const TerminalPanel = forwardRef(function TerminalPanel(
  {
    stdout,
    stderr,
    stdin,
    onStdinChange,
    onRun,
    busy,
    projectId,
    activeFile,
    language,
    onLiveStreamChange,
    onRunningChange,
  },
  ref
) {
  const [terminalInput, setTerminalInput] = useState('');
  const [history, setHistory] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);

  const setRunningState = (val) => {
    setIsRunning(val);
    if (onRunningChange) onRunningChange(val);
  };

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
    if (onStdinChange) onStdinChange('');
    if (onLiveStreamChange) {
      onLiveStreamChange({ stdout: '', stderr: '' });
    }
  };

  const startInteractiveExecution = (overrideFile = null) => {
    const fileToRun = overrideFile || activeFile;
    if (!projectId || !fileToRun) {
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

    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
    let wsUrl;
    try {
      const urlObj = new URL(apiBase);
      const protocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${urlObj.host}/ws/terminal`;
    } catch {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/terminal`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setRunningState(true);
        const token = localStorage.getItem('skycode_token') || '';
        ws.send(JSON.stringify({
          type: 'start',
          projectId,
          entryFile: fileToRun,
          language,
          token
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'started') {
            const displayCmd = msg.command || (fileToRun ? `python -u ${fileToRun}` : 'run');
            setHistory((prev) => [...prev, { type: 'command', content: `$ ${displayCmd}` }]);
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
            setRunningState(false);
            const seconds = (msg.durationMs / 1000).toFixed(2);
            setHistory((prev) => [
              ...prev,
              { type: 'info', content: `[Done] exited with code=${msg.exitCode} in ${seconds}s` },
            ]);
            ws.close();
            socketRef.current = null;
          } else if (msg.type === 'error') {
            appendChunk(`\nError: ${msg.message}\n`, 'stderr');
            currentStderr += `\nError: ${msg.message}\n`;
            if (onLiveStreamChange) {
              onLiveStreamChange({ stdout: currentStdout, stderr: currentStderr });
            }
            setRunningState(false);
          }
        } catch {
          // Ignore
        }
      };

      ws.onerror = () => {
        setRunningState(false);
        if (onRun) onRun(stdin);
      };

      ws.onclose = () => {
        setRunningState(false);
      };
    } catch {
      setRunningState(false);
      if (onRun) onRun(stdin);
    }
  };

  const stopExecution = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'stop' }));
    }
    setRunningState(false);
  };

  useImperativeHandle(ref, () => ({
    startInteractiveExecution: (file) => startInteractiveExecution(file),
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
      const trimmed = rawValue.trim();
      setTerminalInput('');

      if (!trimmed) {
        setHistory((prev) => [...prev, { type: 'prompt_line', prompt: 'skycode@workspace:~/my-app$ ', cmd: '' }]);
        return;
      }

      const lower = trimmed.toLowerCase();
      if (lower === 'clear' || lower === 'cls') {
        handleClear();
        return;
      }

      if (isRunning && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        appendChunk(`${rawValue}\n`, 'stdin');
        socketRef.current.send(JSON.stringify({ type: 'stdin', data: `${rawValue}\n` }));
      } else {
        setHistory((prev) => [...prev, { type: 'prompt_line', prompt: 'skycode@workspace:~/my-app$ ', cmd: rawValue }]);
        startInteractiveExecution();
      }
    }
  };

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className="flex h-full flex-col font-mono text-xs md:text-sm cursor-text overflow-hidden select-text"
      style={{
        background: '#000000',
        color: '#FFFDF5',
        fontFamily: "'Space Mono', monospace",
      }}
    >
      {/* Terminal Viewport */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto p-3.5 font-mono text-xs md:text-sm leading-relaxed"
      >
        {history.length === 0 && !isRunning && (
          <div className="select-none mb-3 text-xs font-mono" style={{ color: '#777777' }}>
            <span style={{ color: '#FFD93D', fontWeight: 700 }}>SkyCode Neo-Terminal v1.0</span> · Type commands or click Run above to execute.
          </div>
        )}

        {history.map((entry, idx) => {
          if (entry.type === 'prompt_line') {
            return (
              <div key={idx} className="flex items-center gap-1.5 leading-relaxed">
                <span style={{ color: '#FFD93D', fontWeight: 800 }} className="select-none">{entry.prompt}</span>
                <span style={{ color: '#FFFDF5' }}>{entry.cmd}</span>
              </div>
            );
          }
          if (entry.type === 'command') {
            return (
              <div key={idx} style={{ color: '#FFFDF5', fontWeight: 700 }} className="select-none leading-relaxed">
                {entry.content}
              </div>
            );
          }
          if (entry.type === 'stdin') {
            return (
              <span key={idx} style={{ color: '#6BCB77', fontWeight: 700 }} className="whitespace-pre-wrap leading-relaxed">
                {entry.content}
              </span>
            );
          }
          if (entry.type === 'info') {
            return (
              <div key={idx} style={{ color: '#6BCB77', fontWeight: 700 }} className="my-1 font-mono text-xs select-none leading-relaxed">
                {entry.content}
              </div>
            );
          }
          if (entry.type === 'stderr') {
            return (
              <span key={idx} style={{ color: '#FF6B6B', fontWeight: 700 }} className="whitespace-pre-wrap leading-relaxed">
                {entry.content}
              </span>
            );
          }
          return (
            <span key={idx} style={{ color: '#FFFDF5' }} className="whitespace-pre-wrap leading-relaxed">
              {entry.content}
            </span>
          );
        })}

        {/* Active Prompt & Input Line */}
        <div className="flex items-center gap-1 text-[#FFFDF5] w-full pt-1">
          {isRunning ? (
            <span style={{ color: '#6BCB77', fontWeight: 800 }} className="shrink-0 select-none animate-pulse">
              &gt;&nbsp;
            </span>
          ) : (
            <span style={{ color: '#FFD93D', fontWeight: 800 }} className="shrink-0 select-none">
              skycode@workspace:~/my-app$&nbsp;
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isRunning && busy}
            spellCheck={false}
            autoComplete="off"
            placeholder={isRunning ? "Send standard input (stdin)..." : ""}
            className="flex-1 border-none bg-transparent p-0 font-mono text-xs md:text-sm text-[#FFFDF5] placeholder:text-[#555555] focus:outline-none focus:ring-0 caret-[#FFD93D]"
          />
        </div>
      </div>
    </div>
  );
});
