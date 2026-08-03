import Editor, { type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { editorLanguage } from '../../utils/language';

interface CodeEditorProps {
  filePath: string | null;
  value: string;
  onChange: (value: string) => void;
  fontSize: number;
  theme: 'dark' | 'light';
}

const snippets = [
  { label: 'print', insertText: 'print($1)', kind: monaco.languages.CompletionItemKind.Snippet },
  { label: 'main', insertText: 'def main():\n    $1\n\nif __name__ == "__main__":\n    main()', kind: monaco.languages.CompletionItemKind.Snippet }
];

export function CodeEditor({ filePath, value, onChange, fontSize, theme }: CodeEditorProps) {
  const language = filePath ? editorLanguage(filePath) : 'plaintext';

  const handleMount: OnMount = (_editor, monacoInstance) => {
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

    monacoInstance.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model, position) => {
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column,
          endColumn: position.column
        };

        return {
          suggestions: snippets.map((snippet) => ({
            ...snippet,
            range,
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet
          }))
        };
      }
    });
  };

  return (
    <Editor
      height="100%"
      theme={theme === 'dark' ? 'online-dark' : 'online-light'}
      language={language}
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? '')}
      beforeMount={() => {
        monaco.editor.setTheme(theme === 'dark' ? 'online-dark' : 'online-light');
      }}
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
