import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { runProjectRequest } from '../../api/projects';
import { detectLanguageFromPath } from '../../utils/language';

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

    let currentStdout = '';
    let currentStderr = '';
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

    // FAST-PATH: If WebSocket is already warm and open, send IMMEDIATELY in 0.001ms!
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(startPayload));
      return;
    }

    let wsUrl = 'wss://skycode-t3ry.onrender.com/ws/terminal';
    let hasReceivedMessage = false;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      const connectionTimer = setTimeout(async () => {
        if (!hasReceivedMessage && ws.readyState !== WebSocket.CLOSED) {
          try { ws.close(); } catch {}
          appendChunk('\n[Terminal connected slowly. Executing via fast direct runner...]\n', 'info');
          try {
            const resp = await runProjectRequest(projectId, fileToRun, effectiveLanguage, stdin);
            if (resp.result?.stdout) appendChunk(resp.result.stdout, 'stdout');
            if (resp.result?.stderr) appendChunk(resp.result.stderr, 'stderr');
            const sec = ((resp.execution?.durationMs || 0) / 1000).toFixed(2);
            appendChunk(`\n[Done] exited with code=${resp.execution?.exitCode ?? 0} in ${sec}s\n`, 'info');
          } catch (err) {
            appendChunk(`\nExecution error: ${err.message}\n`, 'stderr');
          } finally {
            setRunningState(false);
          }
        }
      }, 6000);

      ws.onopen = () => {
        ws.send(JSON.stringify(startPayload));
      };

      ws.onmessage = (event) => {
        hasReceivedMessage = true;
        clearTimeout(connectionTimer);
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'started') {
            if (msg.command && msg.command !== defaultCmd) {
              setHistory((prev) => [...prev, { type: 'command', content: `$ ${msg.command}` }]);
            }
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
            // Keep WebSocket open and warm for instant subsequent runs!
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

      ws.onerror = async () => {
        clearTimeout(connectionTimer);
        setRunningState(false);
        appendChunk('\n[Interactive terminal disconnected. Running via standard runner...]\n', 'info');
        try {
          const resp = await runProjectRequest(projectId, fileToRun, effectiveLanguage, stdin);
          if (resp.result?.stdout) appendChunk(resp.result.stdout, 'stdout');
          if (resp.result?.stderr) appendChunk(resp.result.stderr, 'stderr');
          const sec = ((resp.execution?.durationMs || 0) / 1000).toFixed(2);
          appendChunk(`\n[Done] exited with code=${resp.execution?.exitCode ?? 0} in ${sec}s\n`, 'info');
        } catch (err) {
          appendChunk(`\nExecution error: ${err.message}\n`, 'stderr');
        }
      };

      ws.onclose = () => {
        clearTimeout(connectionTimer);
        setRunningState(false);
        socketRef.current = null;
      };
    } catch (e) {
      setRunningState(false);
      appendChunk(`\nConnection error: ${e.message}\n`, 'stderr');
    }
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

  // Pre-warm WebSocket connection so the first click on Run starts in few milliseconds (0ms network setup!)
  useEffect(() => {
    if (!projectId) return;
    let ws = null;
    try {
      ws = new WebSocket('wss://skycode-t3ry.onrender.com/ws/terminal');
      socketRef.current = ws;
      ws.onclose = () => {
        if (socketRef.current === ws) socketRef.current = null;
      };
    } catch {}
    return () => {
      try { ws?.close(); } catch {}
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
