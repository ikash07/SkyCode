import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { Sidebar } from '../components/layout/Sidebar';
import { Explorer } from '../components/editor/Explorer';
import { SearchPanel } from '../components/editor/SearchPanel';
import { SettingsPanel } from '../components/editor/SettingsPanel';
import { FileTabs } from '../components/editor/FileTabs';
import { CodeEditor } from '../components/editor/CodeEditor';
import { BottomPanel } from '../components/editor/BottomPanel';
import {
  createFolderRequest,
  deleteItemRequest,
  executionHistoryRequest,
  getProjectRequest,
  readFileRequest,
  renameItemRequest,
  runProjectRequest,
  saveFileRequest,
  searchProjectRequest,
  treeRequest,
  updateProjectRequest,
  uploadFilesRequest
} from '../api/projects';
import { useThemeMode } from '../hooks/useThemeMode';
import { detectLanguageFromPath, guessEntryFile } from '../utils/language';
import { ArrowLeft, Play, Folder, Upload, MoreHorizontal, Cloud, Rocket } from 'lucide-react';

export function WorkspacePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { theme } = useThemeMode();
  const [sidebarView, setSidebarView] = useState('explorer');
  const [project, setProject] = useState(null);
  const [tree, setTree] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [latestExecution, setLatestExecution] = useState(null);
  const [bottomTab, setBottomTab] = useState('terminal');
  const [stdin, setStdin] = useState('');
  const [busy, setBusy] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(250);
  const isResizingRef = useRef(false);
  const terminalRef = useRef(null);

  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startY = e.clientY;
    const startHeight = terminalHeight;

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.max(100, Math.min(600, startHeight + deltaY));
      setTerminalHeight(newHeight);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [terminalHeight]);

  const autosaveTimer = useRef(null);
  const [pathDialog, setPathDialog] = useState(null);
  const [pathInput, setPathInput] = useState('');
  const [pathDialogBusy, setPathDialogBusy] = useState(false);

  const activeFileRef = useRef(activeFile);
  activeFileRef.current = activeFile;
  const openFilesRef = useRef(openFiles);
  openFilesRef.current = openFiles;
  const projectRef = useRef(project);
  projectRef.current = project;

  const activeContent = useMemo(
    () => openFiles.find((file) => file.path === activeFile)?.content ?? '',
    [activeFile, openFiles]
  );

  const loadWorkspace = async () => {
    if (!projectId) return;
    const [nextProject, nextTree, history] = await Promise.all([
      getProjectRequest(projectId),
      treeRequest(projectId),
      executionHistoryRequest(projectId)
    ]);
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

  const updateOpenFile = (filePath, content, dirty = true) => {
    setOpenFiles((current) =>
      current.map((file) => (file.path === filePath ? { ...file, content, dirty } : file))
    );
  };

  const saveFile = useCallback(
    async (filePath, skipReload = false) => {
      if (!projectId || !filePath) return;
      const currentFile = openFilesRef.current.find((file) => file.path === filePath);
      if (!currentFile || !currentFile.dirty) return;

      const contentToSave = currentFile.content;
      await saveFileRequest(projectId, currentFile.path, contentToSave);

      setOpenFiles((current) =>
        current.map((file) => {
          if (file.path !== filePath) return file;
          if (file.content === contentToSave) {
            return { ...file, dirty: false };
          }
          return file;
        })
      );

      if (!skipReload) {
        await loadWorkspace();
      }
    },
    [projectId]
  );

  const saveActiveFile = useCallback(async () => {
    const currentActive = activeFileRef.current;
    if (currentActive) {
      await saveFile(currentActive, false);
    }
  }, [saveFile]);

  const triggerAutosave = useCallback(
    (filePath) => {
      if (autosaveTimer.current) {
        window.clearTimeout(autosaveTimer.current);
      }
      autosaveTimer.current = window.setTimeout(() => {
        void saveFile(filePath, true);
      }, 1500);
    },
    [saveFile]
  );

  useEffect(() => {
    const handleShortcut = (event) => {
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
  }, [saveActiveFile, project]);

  const openFile = async (filePath) => {
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

  const runActiveFile = async (overrideStdin = null) => {
    if (!projectId) return;
    setBottomTab('terminal');

    if (terminalRef.current && terminalRef.current.startInteractiveExecution) {
      terminalRef.current.startInteractiveExecution();
      return;
    }

    const entryFile = activeFileRef.current || guessEntryFile(tree, projectRef.current?.language ?? 'python');
    if (!entryFile) return;

    const currentStdin = overrideStdin !== null ? overrideStdin : stdin;

    setBusy(true);
    try {
      const response = await runProjectRequest(
        projectId,
        entryFile,
        projectRef.current?.language || detectLanguageFromPath(entryFile),
        currentStdin
      );
      setLatestExecution(response.execution);
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

  const renamePath = async (path) => {
    if (!projectId) return;
    setPathDialog({
      mode: 'rename',
      title: 'Rename Item',
      confirmLabel: 'Rename',
      initialValue: path,
      onConfirm: async (value) => {
        if (!value || value === path) return;
        await renameItemRequest(projectId, path, value);
        setOpenFiles((current) =>
          current.map((file) =>
            file.path === path || file.path.startsWith(`${path}/`)
              ? { ...file, path: file.path.replace(path, value) }
              : file
          )
        );
        if (activeFileRef.current && (activeFileRef.current === path || activeFileRef.current.startsWith(`${path}/`))) {
          setActiveFile(activeFileRef.current.replace(path, value));
        }
        await loadWorkspace();
      }
    });
    setPathInput(path);
  };

  const deletePath = async (path) => {
    if (!projectId) return;
    if (!window.confirm(`Delete ${path}?`)) return;
    await deleteItemRequest(projectId, path);
    setOpenFiles((current) =>
      current.filter((file) => file.path !== path && !file.path.startsWith(`${path}/`))
    );
    if (activeFileRef.current && (activeFileRef.current === path || activeFileRef.current.startsWith(`${path}/`)))
      setActiveFile(null);
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

  const updateSettings = async (updates) => {
    if (!projectId || !project) return;
    const updated = await updateProjectRequest(projectId, updates);
    setProject(updated);
  };

  if (!project) {
    return (
      <div className="grid min-h-full place-items-center text-sm md:text-base font-medium text-[var(--color-muted)]">
        Loading SkyCode workspace...
      </div>
    );
  }

  return (
    <AppShell projectName={project.name}>
      <div className="flex flex-col md:grid h-auto md:h-[calc(100vh-95px)] md:grid-cols-[60px_280px_1fr] gap-3">
        {/* Left Sidebar */}
        <Sidebar active={sidebarView} onChange={setSidebarView} onRun={() => void runActiveFile()} />

        {/* Dynamic Left Panel */}
        <div className="min-h-0 h-[280px] md:h-full">
          {sidebarView === 'explorer' ? (
            <Explorer
              tree={tree}
              activeFile={activeFile}
              onOpen={(path) => void openFile(path)}
              onCreateFile={() => void createFile()}
              onCreateFolder={() => void createFolder()}
              onRename={(path) => void renamePath(path)}
              onDelete={(path) => void deletePath(path)}
              onUpload={() => void uploadFiles()}
            />
          ) : null}
          {sidebarView === 'search' ? (
            <SearchPanel
              query={searchQuery}
              results={searchResults}
              onQueryChange={setSearchQuery}
              onSearch={() => void search()}
              onOpenFile={(path) => void openFile(path)}
            />
          ) : null}
          {sidebarView === 'settings' ? (
            <SettingsPanel
              project={project}
              onAutoSaveChange={(enabled) => void updateSettings({ settings: { autoSave: enabled } })}
              onFontSizeChange={(fontSize) => void updateSettings({ settings: { fontSize } })}
            />
          ) : null}
        </div>

        {/* Main Editor & Terminal Shell */}
        <div className="editor-shell glass-panel shell-shadow flex min-h-0 flex-1 flex-col rounded-3xl border border-[var(--color-border)] overflow-hidden">
          {/* Editor Header Toolbar */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5 bg-black/5 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-1.5 text-xs md:text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition font-medium"
                title="Back to Dashboard"
              >
                <ArrowLeft size={16} />
                <span className="font-bold uppercase tracking-wider">{project.name}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-[var(--color-accent-soft)] bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">
                {project.language}
              </span>
              <button
                onClick={() => void createFile()}
                className="rounded-lg p-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-black/10 dark:hover:bg-white/10"
                title="New File"
              >
                <Folder size={16} />
              </button>
              <button
                onClick={() => void uploadFiles()}
                className="rounded-lg p-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-black/10 dark:hover:bg-white/10"
                title="Upload File"
              >
                <Upload size={16} />
              </button>
              <button
                onClick={() => void runActiveFile()}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#7c3aed] px-4 py-1.5 text-xs md:text-sm font-bold text-white shadow transition hover:opacity-95 disabled:opacity-60"
              >
                <Play size={13} className="fill-white" />
                Run
              </button>
              <button
                className="rounded-lg p-1.5 text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-black/10 dark:hover:bg-white/10"
                title="More Options"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>

          {/* Open Tabs Bar */}
          <FileTabs
            openFiles={openFiles.map((file) => file.path)}
            activeFile={activeFile}
            onSelect={setActiveFile}
            onClose={(filePath) =>
              setOpenFiles((current) => current.filter((file) => file.path !== filePath))
            }
          />

          {/* Main Workspace Editor View */}
          <div className="relative min-h-0 flex-1">
            {activeFile ? (
              <CodeEditor
                filePath={activeFile}
                value={activeContent}
                onChange={(nextContent) => {
                  if (!activeFile) return;
                  updateOpenFile(activeFile, nextContent, true);
                  if (projectRef.current?.settings.autoSave) {
                    triggerAutosave(activeFile);
                  }
                }}
                fontSize={project.settings.fontSize || 15}
                theme={theme}
              />
            ) : (
              /* Watermark Empty State */
              <div className="grid h-full place-items-center text-center select-none p-6">
                <div className="flex flex-col items-center">
                  <div className="skycode-logo-glow flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#4f8cff]/20 to-[#7c3aed]/20 border border-[var(--color-border)] mb-3">
                    <Rocket size={32} className="text-[var(--color-accent)] opacity-80" />
                  </div>
                  <div className="text-base md:text-lg font-bold text-[var(--color-text)]">Build something great</div>
                  <div className="mt-1 text-xs md:text-sm text-[var(--color-muted)] font-medium">
                    Select a file from the explorer to start coding.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resizable Terminal Container */}
          <div style={{ height: `${terminalHeight}px` }} className="relative flex flex-col p-2 pt-0 shrink-0">
            <div
              onMouseDown={handleResizeMouseDown}
              className="group flex h-2 w-full cursor-ns-resize items-center justify-center py-0.5 select-none rounded transition-colors shrink-0"
              title="Drag to resize terminal"
            >
              <div className="h-1 w-12 rounded-full bg-black/20 dark:bg-white/20 group-hover:bg-[var(--color-accent)] transition-colors" />
            </div>

            <div className="min-h-0 flex-1">
              <BottomPanel
                ref={terminalRef}
                activeTab={bottomTab}
                onTabChange={setBottomTab}
                latestExecution={latestExecution}
                stdin={stdin}
                onStdinChange={setStdin}
                onRun={(customStdin) => void runActiveFile(customStdin)}
                busy={busy}
                projectId={projectId}
                activeFile={activeFile}
                language={project?.language}
              />
            </div>
          </div>

          {/* Footer Status Bar */}
          <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-black/10 dark:bg-white/[0.03] px-3.5 py-1.5 text-xs font-mono text-[var(--color-muted)] select-none shrink-0">
            <div className="flex items-center gap-3.5 font-medium">
              <span>{project.language === 'python' ? 'Python 3.11.6' : project.language === 'javascript' ? 'Node.js' : project.language === 'c' ? 'GCC C17' : project.language === 'java' ? 'JDK 21' : project.language?.toUpperCase() || 'UTF-8'}</span>
              <span>UTF-8</span>
              <span>Spaces: 4</span>
              <span>Ln 12, Col 5</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-sans text-xs font-semibold">
              <Cloud size={14} />
              <span>Synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Path Dialog Modal */}
      {pathDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-[var(--color-border)] bg-[var(--color-panel)] p-6 shadow-2xl backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.32em] font-bold text-[var(--color-muted)]">{pathDialog.title}</div>
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
              className="mt-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 outline-none text-xs md:text-sm text-[var(--color-text)] font-medium"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setPathDialog(null);
                  setPathInput('');
                }}
                className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-xs md:text-sm font-semibold text-[var(--color-text)]"
              >
                Cancel
              </button>
              <button
                onClick={() => void submitPathDialog()}
                disabled={pathDialogBusy || !pathInput.trim()}
                className="rounded-2xl bg-gradient-to-r from-[#4f8cff] to-[#7c3aed] px-4 py-2 text-xs md:text-sm font-bold text-white shadow disabled:opacity-60"
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
