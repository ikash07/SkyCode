import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Sidebar, type SidebarView } from '../components/layout/Sidebar';
import { Explorer } from '../components/editor/Explorer';
import { SearchPanel } from '../components/editor/SearchPanel';
import { SettingsPanel } from '../components/editor/SettingsPanel';
import { FileTabs } from '../components/editor/FileTabs';
import { CodeEditor } from '../components/editor/CodeEditor';
import { BottomPanel } from '../components/editor/BottomPanel';
import { createFolderRequest, deleteItemRequest, executionHistoryRequest, getProjectRequest, readFileRequest, renameItemRequest, runProjectRequest, saveFileRequest, searchProjectRequest, treeRequest, updateProjectRequest, uploadFilesRequest } from '../api/projects';
import type { ExecutionRecord, Project, SearchMatch, TreeNode } from '../types/api';
import { useThemeMode } from '../hooks/useThemeMode';
import { detectLanguageFromPath, guessEntryFile } from '../utils/language';

interface OpenFile {
  path: string;
  content: string;
  dirty: boolean;
}

type BottomTab = 'terminal' | 'output' | 'problems';
type PathDialogMode = 'create-file' | 'create-folder' | 'rename';

interface PathDialogState {
  mode: PathDialogMode;
  title: string;
  confirmLabel: string;
  initialValue: string;
  onConfirm: (value: string) => Promise<void> | void;
}

export function WorkspacePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeMode();
  const [sidebarView, setSidebarView] = useState<SidebarView>('explorer');
  const [project, setProject] = useState<Project | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [latestExecution, setLatestExecution] = useState<ExecutionRecord | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>('terminal');
  const [busy, setBusy] = useState(false);
  const autosaveTimer = useRef<number | null>(null);
  const [pathDialog, setPathDialog] = useState<PathDialogState | null>(null);
  const [pathInput, setPathInput] = useState('');
  const [pathDialogBusy, setPathDialogBusy] = useState(false);

  const activeContent = useMemo(() => openFiles.find((file) => file.path === activeFile)?.content ?? '', [activeFile, openFiles]);

  const loadWorkspace = async () => {
    if (!projectId) return;
    const [nextProject, nextTree, history] = await Promise.all([getProjectRequest(projectId), treeRequest(projectId), executionHistoryRequest(projectId)]);
    setProject(nextProject);
    setTree(nextTree);
    setLatestExecution(history[0] ?? null);
  };

  useEffect(() => {
    if (!projectId) {
      navigate('/');
      return;
    }
    void loadWorkspace();
  }, [projectId]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveActiveFile();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void runActiveFile();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [activeFile, openFiles, project]);

  const updateOpenFile = (filePath: string, content: string, dirty = true) => {
    setOpenFiles((current) => current.map((file) => (file.path === filePath ? { ...file, content, dirty } : file)));
  };

  const openFile = async (filePath: string) => {
    if (!projectId) return;
    const existing = openFiles.find((file) => file.path === filePath);
    if (existing) {
      setActiveFile(filePath);
      return;
    }

    const file = await readFileRequest(projectId, filePath);
    setOpenFiles((current) => [...current, { path: file.path, content: file.content, dirty: false }]);
    setActiveFile(file.path);
  };

  const saveActiveFile = async () => {
    if (!projectId || !activeFile) return;
    const currentFile = openFiles.find((file) => file.path === activeFile);
    if (!currentFile) return;

    const saved = await saveFileRequest(projectId, currentFile.path, currentFile.content);
    updateOpenFile(saved.path, saved.content, false);
    await loadWorkspace();
  };

  const runActiveFile = async () => {
    if (!projectId) return;
    const entryFile = activeFile || guessEntryFile(tree, project?.language ?? 'python');
    if (!entryFile) return;

    setBusy(true);
    try {
      const response = await runProjectRequest(projectId, entryFile, project?.language || detectLanguageFromPath(entryFile));
      setLatestExecution(response.execution);
      setBottomTab('terminal');
      await loadWorkspace();
    } finally {
      setBusy(false);
    }
  };

  const createFile = async () => {
    if (!projectId) return;
    setPathDialog({
      mode: 'create-file',
      title: 'Create File',
      confirmLabel: 'Create file',
      initialValue: '',
      onConfirm: async (value) => {
        await saveFileRequest(projectId, value, '');
        await loadWorkspace();
        await openFile(value);
      }
    });
    setPathInput('');
  };

  const createFolder = async () => {
    if (!projectId) return;
    setPathDialog({
      mode: 'create-folder',
      title: 'Create Folder',
      confirmLabel: 'Create folder',
      initialValue: '',
      onConfirm: async (value) => {
        await createFolderRequest(projectId, value);
        await loadWorkspace();
      }
    });
    setPathInput('');
  };

  const renamePath = async (path: string) => {
    if (!projectId) return;
    setPathDialog({
      mode: 'rename',
      title: 'Rename Item',
      confirmLabel: 'Rename',
      initialValue: path,
      onConfirm: async (value) => {
        if (!value || value === path) return;
        await renameItemRequest(projectId, path, value);
        setOpenFiles((current) => current.map((file) => (file.path === path || file.path.startsWith(`${path}/`) ? { ...file, path: file.path.replace(path, value) } : file)));
        if (activeFile && (activeFile === path || activeFile.startsWith(`${path}/`))) {
          setActiveFile(activeFile.replace(path, value));
        }
        await loadWorkspace();
      }
    });
    setPathInput(path);
  };

  const deletePath = async (path: string) => {
    if (!projectId) return;
    if (!window.confirm(`Delete ${path}?`)) return;
    await deleteItemRequest(projectId, path);
    setOpenFiles((current) => current.filter((file) => file.path !== path && !file.path.startsWith(`${path}/`)));
    if (activeFile && (activeFile === path || activeFile.startsWith(`${path}/`))) setActiveFile(null);
    await loadWorkspace();
  };

  const uploadFiles = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async () => {
      if (!projectId || !input.files?.length) return;
      await uploadFilesRequest(projectId, Array.from(input.files));
      await loadWorkspace();
    };
    input.click();
  };

  const submitPathDialog = async () => {
    if (!pathDialog) return;
    const value = pathInput.trim();
    if (!value) return;

    setPathDialogBusy(true);
    try {
      await pathDialog.onConfirm(value);
      setPathDialog(null);
      setPathInput('');
    } finally {
      setPathDialogBusy(false);
    }
  };

  const search = async () => {
    if (!projectId || !searchQuery.trim()) return;
    setSearchResults(await searchProjectRequest(projectId, searchQuery));
  };

  const updateSettings = async (updates: Partial<Pick<Project, 'language' | 'theme' | 'name' | 'description'>> & { settings?: Partial<Project['settings']> }) => {
    if (!projectId || !project) return;
    const updated = await updateProjectRequest(projectId, updates);
    setProject(updated);
  };

  if (!project) {
    return <div className="grid min-h-full place-items-center text-sm text-[var(--color-muted)]">Loading project...</div>;
  }

  return (
    <AppShell>
      <div className="grid h-[calc(100vh-110px)] grid-cols-[64px_300px_1fr] gap-3">
        <Sidebar active={sidebarView} onChange={setSidebarView} onRun={() => void runActiveFile()} />

        <div className="min-h-0">
          {sidebarView === 'explorer' ? <Explorer tree={tree} activeFile={activeFile} onOpen={(path) => void openFile(path)} onCreateFile={() => void createFile()} onCreateFolder={() => void createFolder()} onRename={(path) => void renamePath(path)} onDelete={(path) => void deletePath(path)} onUpload={() => void uploadFiles()} /> : null}
          {sidebarView === 'search' ? <SearchPanel query={searchQuery} results={searchResults} onQueryChange={setSearchQuery} onSearch={() => void search()} onOpenFile={(path) => void openFile(path)} /> : null}
          {sidebarView === 'settings' ? <SettingsPanel project={project} onAutoSaveChange={(enabled) => void updateSettings({ settings: { autoSave: enabled } })} onFontSizeChange={(fontSize) => void updateSettings({ settings: { fontSize } })} /> : null}
        </div>

        <div className="editor-shell glass-panel shell-shadow flex min-h-0 flex-col rounded-3xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div>
              <div className="text-xs uppercase tracking-[0.32em] text-[var(--color-muted)]">{project.name}</div>
              <div className="text-sm text-[var(--color-muted)]">{busy ? 'Running in Docker...' : 'Ready'}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs uppercase tracking-[0.25em] text-[var(--color-accent)]">{project.language}</span>
              <button onClick={() => void runActiveFile()} disabled={busy} className="rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Run</button>
            </div>
          </div>

          <FileTabs openFiles={openFiles.map((file) => file.path)} activeFile={activeFile} onSelect={setActiveFile} onClose={(filePath) => setOpenFiles((current) => current.filter((file) => file.path !== filePath))} />

          <div className="min-h-0 flex-1">
            {activeFile ? (
              <CodeEditor
                filePath={activeFile}
                value={activeContent}
                onChange={(nextContent) => {
                  if (!activeFile) return;
                  updateOpenFile(activeFile, nextContent, true);
                  if (project.settings.autoSave) {
                    if (autosaveTimer.current) {
                      window.clearTimeout(autosaveTimer.current);
                    }
                    autosaveTimer.current = window.setTimeout(() => void saveActiveFile(), 800);
                  }
                }}
                fontSize={project.settings.fontSize}
                theme={theme}
              />
            ) : (
              <div className="grid h-full place-items-center text-center text-sm text-[var(--color-muted)]">
                <div>
                  <div className="text-lg font-semibold text-[var(--color-text)]">Open a file to start editing</div>
                  <div className="mt-2">Use the Explorer to browse or create files and folders.</div>
                </div>
              </div>
            )}
          </div>

          <div className="h-[260px] p-3">
            <BottomPanel activeTab={bottomTab} onTabChange={setBottomTab} latestExecution={latestExecution} />
          </div>
        </div>
      </div>

      {pathDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-2xl backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.32em] text-[var(--color-muted)]">{pathDialog.title}</div>
            <input
              autoFocus
              value={pathInput}
              onChange={(event) => setPathInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submitPathDialog();
                }
                if (event.key === 'Escape') {
                  setPathDialog(null);
                  setPathInput('');
                }
              }}
              placeholder={pathDialog.mode === 'rename' ? 'Enter new path' : 'Enter path like src/main.py'}
              className="mt-4 w-full rounded-2xl border border-[var(--color-border)] bg-black/10 px-4 py-3 outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setPathDialog(null);
                  setPathInput('');
                }}
                className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitPathDialog()}
                disabled={pathDialogBusy || !pathInput.trim()}
                className="rounded-2xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {pathDialogBusy ? 'Saving...' : pathDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
