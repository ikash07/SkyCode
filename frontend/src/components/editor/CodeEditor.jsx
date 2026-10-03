import { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { editorLanguage } from '../../utils/language';

export function CodeEditor({ filePath, value, onChange, fontSize = 14, theme = 'dark' }) {
  const language = filePath ? editorLanguage(filePath) : 'plaintext';
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isInternalChange = useRef(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const currentValue = model.getValue();
    if (currentValue !== value && !isInternalChange.current) {
      editor.setValue(value ?? '');
    }
    isInternalChange.current = false;
  }, [value]);

  const handleMount = (editor, monacoInstance) => {
    editorRef.current = editor;

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
      key={filePath}
      height="100%"
      theme="minimal-white"
      language={language}
      defaultValue={value ?? ''}
      onMount={handleMount}
      options={{
        fontSize,
        fontFamily: "'Space Mono', monospace, Consolas",
        minimap: { enabled: true },
        smoothScrolling: true,
        automaticLayout: true,
        mouseWheelZoom: true,
        tabSize: 4,
        padding: { top: 12 },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        lineNumbersMinChars: 3,
        wordWrap: 'on'
      }}
    />
  );
}
