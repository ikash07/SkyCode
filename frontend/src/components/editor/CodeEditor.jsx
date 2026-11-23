import { useRef, useEffect, memo } from 'react';
import Editor from '@monaco-editor/react';
import { editorLanguage } from '../../utils/language';

export const CodeEditor = memo(function CodeEditor({ projectId, filePath, value, onChange, fontSize = 14, theme = 'dark' }) {
  const language = filePath ? editorLanguage(filePath) : 'plaintext';
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isInternalChange = useRef(false);

  // 1. Instant file switching effect (only runs when active file, language, or projectId changes)
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !filePath) return;

    const uri = monaco.Uri.parse(`file:///${projectId || 'global'}/${filePath.replace(/^\/+/, '')}`);
    let model = monaco.editor.getModel(uri);
    if (!model) {
      model = monaco.editor.createModel(value ?? '', language, uri);
    } else {
      if (model.getLanguageId() !== language) {
        monaco.editor.setModelLanguage(model, language);
      }
      if (value !== undefined && (model.getValue() === '' || (value !== '' && model.getValue() !== value))) {
        model.setValue(value);
      }
    }

    if (editor.getModel() !== model) {
      editor.setModel(model);
    }
  }, [filePath, language, projectId]);

  // 2. External value sync (only runs when file is loaded from network or starter files)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const model = editor.getModel();
    if (model && value !== undefined && model.getValue() !== value) {
      model.setValue(value);
    }
  }, [value]);

  const handleMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    monacoInstance.editor.defineTheme('minimal-white', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'D9264D', fontStyle: 'bold' },
        { token: 'string', foreground: '15803D' },
        { token: 'comment', foreground: '888888', fontStyle: 'italic' },
        { token: 'number', foreground: 'C2410C' },
        { token: 'function', foreground: '1D4ED8' }
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#111827',
        'editorLineNumber.foreground': '#9CA3AF',
        'editorLineNumber.activeForeground': '#000000',
        'editorCursor.foreground': '#000000',
        'editor.lineHighlightBackground': '#F9FAFB',
        'editor.lineHighlightBorder': '#F3F4F6',
        'editor.selectionBackground': '#FFD93D66',
        'editor.inactiveSelectionBackground': '#FFD93D33',
        'editorGutter.background': '#FFFFFF',
        'editorBracketMatch.background': '#FFD93D40',
        'editorBracketMatch.border': '#000000'
      }
    });

    monacoInstance.editor.setTheme('minimal-white');

    if (monacoInstance.languages && monacoInstance.languages.registerCompletionItemProvider) {
      monacoInstance.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: (model, position) => {
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          };

          const snippetKind = monacoInstance.languages.CompletionItemKind
            ? monacoInstance.languages.CompletionItemKind.Snippet
            : 27;

          return {
            suggestions: [
              {
                label: 'print',
                insertText: 'print($1)',
                kind: snippetKind,
                range,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule
                  ? monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
                  : 4
              },
              {
                label: 'main',
                insertText: 'def main():\n    $1\n\nif __name__ == "__main__":\n    main()',
                kind: snippetKind,
                range,
                insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule
                  ? monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
                  : 4
              }
            ]
          };
        }
      });

      monacoInstance.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: (model, position) => {
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: position.column,
            endColumn: position.column
          };

          const snippetKind = monacoInstance.languages.CompletionItemKind
            ? monacoInstance.languages.CompletionItemKind.Snippet
            : 27;

          return {
            suggestions: [
              {
                label: 'clg',
                insertText: 'console.log($1);',
                kind: snippetKind,
                range,
                insertTextRules: 4
              },
              {
                label: 'log',
                insertText: 'console.log($1);',
                kind: snippetKind,
                range,
                insertTextRules: 4
              },
              {
                label: 'fn',
                insertText: 'function $1($2) {\n  $3\n}',
                kind: snippetKind,
                range,
                insertTextRules: 4
              }
            ]
          };
        }
      });
    }

    // Capture-phase clipboard handling for robust copy, cut, and paste
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener(
        'paste',
        (e) => {
          const text = e.clipboardData?.getData('text/plain');
          if (text !== undefined && text !== '') {
            const selection = editor.getSelection();
            if (selection) {
              editor.executeEdits('clipboard-paste', [
                {
                  range: selection,
                  text: text,
                  forceMoveMarkers: true
                }
              ]);
              editor.pushUndoStop();
              e.preventDefault();
              e.stopPropagation();
            }
          }
        },
        true
      );

      domNode.addEventListener(
        'copy',
        (e) => {
          const selection = editor.getSelection();
          if (selection && !selection.isEmpty()) {
            const text = editor.getModel()?.getValueInRange(selection);
            if (text && e.clipboardData) {
              e.clipboardData.setData('text/plain', text);
            }
          }
        },
        true
      );

      domNode.addEventListener(
        'cut',
        (e) => {
          const selection = editor.getSelection();
          if (selection && !selection.isEmpty()) {
            const text = editor.getModel()?.getValueInRange(selection);
            if (text && e.clipboardData) {
              e.clipboardData.setData('text/plain', text);
              editor.executeEdits('clipboard-cut', [
                {
                  range: selection,
                  text: '',
                  forceMoveMarkers: true
                }
              ]);
              editor.pushUndoStop();
            }
          }
        },
        true
      );
    }

    // Explicit Monaco clipboard actions for Ctrl/Cmd+V and Ctrl/Cmd+C
    editor.addAction({
      id: 'skycode-paste-action',
      label: 'Paste from Clipboard',
      keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyV],
      run: async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            const text = await navigator.clipboard.readText();
            if (text) {
              const selection = editor.getSelection();
              if (selection) {
                editor.executeEdits('skycode-paste', [
                  {
                    range: selection,
                    text: text,
                    forceMoveMarkers: true
                  }
                ]);
                editor.pushUndoStop();
              }
            }
          }
        } catch {
          // Native paste event handler catches it if browser blocks async readText
        }
      }
    });

    editor.addAction({
      id: 'skycode-copy-action',
      label: 'Copy to Clipboard',
      keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyC],
      run: async () => {
        try {
          const selection = editor.getSelection();
          if (selection && !selection.isEmpty()) {
            const text = editor.getModel()?.getValueInRange(selection);
            if (text && navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(text);
            }
          }
        } catch {
          // Handled by native copy event
        }
      }
    });

    // Initialize active file model on mount
    if (filePath) {
      const uri = monacoInstance.Uri.parse(`file:///${filePath.replace(/^\/+/, '')}`);
      let model = monacoInstance.editor.getModel(uri);
      if (!model) {
        model = monacoInstance.editor.createModel(value ?? '', language, uri);
      }
      editor.setModel(model);
    }

    editor.onDidChangeModelContent(() => {
      const currentValue = editor.getModel()?.getValue() ?? '';
      isInternalChange.current = true;
      if (onChangeRef.current) {
        onChangeRef.current(currentValue);
      }
    });
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ fontSize });
      editorRef.current.layout();
    }
  }, [fontSize]);

  return (
    <Editor
      height="100%"
      theme="minimal-white"
      loading={<div className="h-full w-full" style={{ background: 'var(--color-panel, #fff)' }} />}
      language={language}
      onMount={handleMount}
      options={{
        fontSize,
        fontFamily: "'Space Mono', monospace, Consolas",
        minimap: { enabled: false },
        smoothScrolling: true,
        automaticLayout: true,
        mouseWheelZoom: true,
        mouseWheelScrollSensitivity: 1.2,
        fastScrollSensitivity: 6,
        tabSize: 4,
        padding: { top: 12 },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        lineNumbersMinChars: 3,
        wordWrap: 'on',
        renderValidationDecorations: 'editable',
        quickSuggestions: { other: true, comments: false, strings: false },
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8
        }
      }}
    />
  );
});
