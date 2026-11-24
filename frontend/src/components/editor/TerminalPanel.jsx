import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { runProjectRequest } from '../../api/projects';
import { detectLanguageFromPath } from '../../utils/language';

function getWsUrl() {
  const token = localStorage.getItem('skycode_token') || '';
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) {
    const wsBase = envBase.replace(/^http/, 'ws').replace(/\/api\/?$/, '');
    return `${wsBase}/ws/terminal${tokenParam}`;
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `ws://localhost:4000/ws/terminal${tokenParam}`;
  }
  return `wss://skycode-t3ry.onrender.com/ws/terminal${tokenParam}`;
}

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
  const pendingPayloadRef = useRef(null);
  const hasReceivedMessageRef = useRef(false);
  const fallbackTimerRef = useRef(null);
  const currentStreamRef = useRef({ stdout: '', stderr: '' });

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
    currentStreamRef.current = { stdout: '', stderr: '' };
    if (onStdinChange) onStdinChange('');
    if (onLiveStreamChange) {
      onLiveStreamChange({ stdout: '', stderr: '' });
    }
  };

  const executeHttpFallback = async (fileToRun, effectiveLanguage, currentStdin) => {
    appendChunk('\n[Direct runner fallback initiated...]\n', 'info');
    try {
      const resp = await runProjectRequest(projectId, fileToRun, effectiveLanguage, currentStdin);
      if (resp.result?.stdout) appendChunk(resp.result.stdout, 'stdout');
      if (resp.result?.stderr) appendChunk(resp.result.stderr, 'stderr');
      const sec = ((resp.execution?.durationMs || 0) / 1000).toFixed(2);
      appendChunk(`\n[Done] exited with code=${resp.execution?.exitCode ?? 0} in ${sec}s\n`, 'info');
    } catch (err) {
      appendChunk(`\nExecution error: ${err.message}\n`, 'stderr');
    } finally {
      setRunningState(false);
    }
  };

  const setupWebSocket = (initialPayload = null) => {
    if (initialPayload) {
      pendingPayloadRef.current = initialPayload;
    }

    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        if (pendingPayloadRef.current) {
          const payload = pendingPayloadRef.current;
          pendingPayloadRef.current = null;
          socketRef.current.send(JSON.stringify(payload));
        }
        return socketRef.current;
      }
      if (socketRef.current.readyState === WebSocket.CONNECTING) {
        return socketRef.current;
      }
      try { socketRef.current.close(); } catch {}
      socketRef.current = null;
    }

    try {
      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (pendingPayloadRef.current && socketRef.current === ws) {
          const payload = pendingPayloadRef.current;
          pendingPayloadRef.current = null;
          ws.send(JSON.stringify(payload));
        }
      };

      ws.onmessage = (event) => {
        hasReceivedMessageRef.current = true;
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }

        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'started') {
            if (msg.command) {
              setHistory((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.type === 'command') {
                  return [...prev.slice(0, -1), { type: 'command', content: `$ ${msg.command}` }];
                }
                return [...prev, { type: 'command', content: `$ ${msg.command}` }];
              });
            }
          } else if (msg.type === 'stdout') {
            appendChunk(msg.data, 'stdout');
            currentStreamRef.current.stdout += msg.data;
            if (onLiveStreamChange) onLiveStreamChange({ ...currentStreamRef.current });
          } else if (msg.type === 'stderr') {
            appendChunk(msg.data, 'stderr');
            currentStreamRef.current.stderr += msg.data;
            if (onLiveStreamChange) onLiveStreamChange({ ...currentStreamRef.current });
          } else if (msg.type === 'exit') {
            setRunningState(false);
            const seconds = ((msg.durationMs || 0) / 1000).toFixed(2);
            setHistory((prev) => [
              ...prev,
              { type: 'info', content: `[Done] exited with code=${msg.exitCode ?? 0} in ${seconds}s` },
            ]);
          } else if (msg.type === 'error') {
            appendChunk(`\nError: ${msg.message}\n`, 'stderr');
            currentStreamRef.current.stderr += `\nError: ${msg.message}\n`;
            if (onLiveStreamChange) onLiveStreamChange({ ...currentStreamRef.current });
            setRunningState(false);
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('WS terminal error:', err);
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        if (isRunning && !hasReceivedMessageRef.current) {
          setRunningState(false);
        }
      };

      ws.onclose = () => {
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        if (socketRef.current === ws) {
          socketRef.current = null;
        }
        setRunningState(false);
      };

      return ws;
    } catch (e) {
      console.warn('WS create error:', e);
      return null;
    }
  };

  const startInteractiveExecution = (overrideFile = null, overrideLanguage = null, overrideContent = null) => {
    const rawFile = overrideFile || activeFile || '';
    const fileToRun = rawFile.trim().replace(/^['"]|['"]$/g, '').replace(/^\.\//, '').replace(/^\/+/, '');
    const effectiveLanguage =
      overrideLanguage ||
      (fileToRun ? detectLanguageFromPath(fileToRun) : language) ||
      'python';

    if (!projectId || !fileToRun) {
      if (onRun) onRun(stdin);
      return;
    }

    currentStreamRef.current = { stdout: '', stderr: '' };
    if (onLiveStreamChange) {
      onLiveStreamChange({ stdout: '', stderr: '' });
    }

    // Immediate terminal feedback: show running status & display command instantly in 0ms!
    setRunningState(true);
    const displayFile = fileToRun.includes(' ') ? `"${fileToRun}"` : fileToRun;
    const defaultCmd = fileToRun
      ? (effectiveLanguage === 'javascript' ? `node ${displayFile}`
        : effectiveLanguage === 'cpp' ? `g++ ${displayFile} -o program && ./program`
        : effectiveLanguage === 'c' ? `gcc ${displayFile} && ./a.out`
        : effectiveLanguage === 'java' ? `javac ${displayFile} && java Main`
        : `python3 -u ${displayFile}`)
      : 'run';
    setHistory((prev) => [...prev, { type: 'command', content: `$ ${defaultCmd}` }]);

    const token = localStorage.getItem('skycode_token') || '';
    const startPayload = {
      type: 'start',
      projectId,
      entryFile: fileToRun,
      language: effectiveLanguage,
      content: typeof overrideContent === 'string' ? overrideContent : undefined,
      token
    };

    hasReceivedMessageRef.current = false;
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }

    // Fallback safety: if WebSocket does not respond within 5s, run via HTTP runner
    fallbackTimerRef.current = setTimeout(() => {
      if (!hasReceivedMessageRef.current) {
        console.warn('WS timed out waiting for execution response. Triggering fallback.');
        executeHttpFallback(fileToRun, effectiveLanguage, stdin);
      }
    }, 5000);

    // Send payload via active or new WebSocket with full message listener coverage!
    setupWebSocket(startPayload);
  };

  const stopExecution = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'stop' }));
    }
    setRunningState(false);
  };

  useImperativeHandle(ref, () => ({
    startInteractiveExecution: (file, lang, content) => startInteractiveExecution(file, lang, content),
    stopExecution,
    clearTerminal: handleClear
  }));

  // Pre-warm WebSocket connection on mount so Run starts instantly
  useEffect(() => {
    if (!projectId) return;
    setupWebSocket();
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      try {
        socketRef.current?.close();
      } catch {}
      socketRef.current = null;
    };
  }, [projectId]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

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
        if (onRun) {
          onRun();
        } else {
          startInteractiveExecution();
        }
      }
    }
  };

  const handleContainerClick = () => {
    // If user has selected text to copy, do not steal focus or clear selection
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return;
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;
    if (isRunning && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      e.preventDefault();
      appendChunk(text, 'stdin');
      socketRef.current.send(JSON.stringify({ type: 'stdin', data: text }));
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      onPaste={handlePaste}
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
