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

    monacoInstance.editor.defineTheme('online-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#07111d',
        'editorLineNumber.foreground': '#51627a',
        'editorLineNumber.activeForeground': '#c7d4e7'
      }
    });

    monacoInstance.editor.defineTheme('online-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#f7fafc',
        'editorLineNumber.foreground': '#76879c',
        'editorLineNumber.activeForeground': '#102033'
      }
    });

    monacoInstance.editor.setTheme(theme === 'dark' ? 'online-dark' : 'online-light');

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
    }
  }, [fontSize]);

  return (
    <Editor
      key={filePath}
      height="100%"
      theme={theme === 'dark' ? 'online-dark' : 'online-light'}
      language={language}
      defaultValue={value ?? ''}
      onMount={handleMount}
      options={{
        fontSize,
        minimap: { enabled: true },
        smoothScrolling: true,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 12 },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'all',
        lineNumbersMinChars: 3,
        wordWrap: 'on'
      }}
    />
  );
}
