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
import { Play, Terminal, Cloud } from 'lucide-react';

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
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const isResizingRef = useRef(false);
  const terminalRef = useRef(null);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const dynamicCodeFontSize = useMemo(() => {
    const customSize = project?.settings?.fontSize;
    if (customSize && customSize !== 14 && customSize !== 15) {
      return customSize;
    }
    if (windowWidth < 640) return 11;
    if (windowWidth < 768) return 12;
    if (windowWidth < 1024) return 13;
    if (windowWidth < 1440) return 14;
    if (windowWidth < 1920) return 15;
    return 16;
  }, [windowWidth, project?.settings?.fontSize]);

  const toggleTerminal = () => {
    setIsTerminalVisible((prev) => !prev);
    if (!isTerminalVisible) {
      setBottomTab('terminal');
    }
  };

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
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [pathDialog, setPathDialog] = useState(null);
  const [pathInput, setPathInput] = useState('');
  const [pathDialogBusy, setPathDialogBusy] = useState(false);
  const [pathDialogSaveSelectedFile, setPathDialogSaveSelectedFile] = useState(true);

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

    // 1. Resolve entry file immediately
    const targetFile = activeFileRef.current || activeFile || guessEntryFile(tree, projectRef.current?.language ?? 'python');
    if (!activeFile && targetFile) {
      setActiveFile(targetFile);
    }

    // 2. Save any dirty/unsaved edits immediately before executing so backend runs latest code
    const fileToSave = targetFile || activeFileRef.current;
    if (fileToSave) {
      const currentDoc = openFilesRef.current.find((f) => f.path === fileToSave);
      if (currentDoc && currentDoc.dirty) {
        await saveFile(fileToSave);
      }
    }

    // 3. Make terminal visible and switch tab
    setIsTerminalVisible(true);
    setBottomTab('terminal');

    // 4. Run immediately on 1st click
    if (terminalRef.current && terminalRef.current.startInteractiveExecution) {
      terminalRef.current.startInteractiveExecution(targetFile);
      return;
    }

    if (!targetFile) return;

    const currentStdin = overrideStdin !== null ? overrideStdin : stdin;

    setBusy(true);
    try {
      const response = await runProjectRequest(
        projectId,
        targetFile,
        projectRef.current?.language || detectLanguageFromPath(targetFile),
        currentStdin
      );
      setLatestExecution(response.execution);
      await loadWorkspace();
    } finally {
      setBusy(false);
    }
  };

  const createFile = async (parentFolder = null) => {
    if (!projectId) return;
    const baseFolder = parentFolder || selectedFolder || '';
    setPathDialog({
      mode: 'create-file',
      title: 'Create File',
      confirmLabel: 'Create file',
      initialValue: baseFolder ? `${baseFolder}/` : '',
      onConfirm: async (value) => {
        const filePath = value.trim();
        if (!filePath) return;
        await saveFileRequest(projectId, filePath, '');
        await loadWorkspace();
        await openFile(filePath);
      }
    });
    setPathInput(baseFolder ? `${baseFolder}/` : '');
  };

  const createFolder = async (parentFolder = null) => {
    if (!projectId) return;
    const currentActive = activeFileRef.current;
    const activeFileName = currentActive ? currentActive.split('/').pop() : null;
    const baseFolder = parentFolder || selectedFolder || '';

    // If an active file is open, default to moving it inside the new folder
    setPathDialogSaveSelectedFile(Boolean(currentActive));
    setPathDialog({
      mode: 'create-folder',
      title: 'Create Folder',
      confirmLabel: 'Create folder',
      initialValue: baseFolder ? `${baseFolder}/` : '',
      selectedFile: currentActive,
      selectedFileName: activeFileName,
      onConfirm: async (folderNameInput, saveSelectedInside = true) => {
        const folderPath = folderNameInput.trim().replace(/\/+$/, '');
        if (!folderPath) return;

        // 1. Create the new folder on backend
        await createFolderRequest(projectId, folderPath);

        // 2. If user had an active file and chose to save inside:
        if (currentActive && saveSelectedInside) {
          // If active file was dirty, save content first
          if (openFilesRef.current.some((f) => f.path === currentActive && f.dirty)) {
            await saveFile(currentActive, true);
          }

          const targetFilePath = `${folderPath}/${activeFileName}`;
          await renameItemRequest(projectId, currentActive, targetFilePath);

          // Update openFiles tabs to reflect the new path
          setOpenFiles((current) =>
            current.map((file) =>
              file.path === currentActive || file.path.startsWith(`${currentActive}/`)
                ? { ...file, path: targetFilePath }
                : file
            )
          );

          // Set active file to the new location inside the folder
          setActiveFile(targetFilePath);
        }

        // 3. Reload tree
        await loadWorkspace();
      }
    });
    setPathInput(baseFolder ? `${baseFolder}/` : '');
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
      if (pathDialog.mode === 'create-folder') {
        await pathDialog.onConfirm(value, pathDialogSaveSelectedFile);
      } else {
        await pathDialog.onConfirm(value);
      }
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
      <div
        className="grid min-h-full place-items-center"
        style={{ background: 'var(--color-canvas)' }}
      >
        <div
          className="flex flex-col items-center gap-3 px-8 py-6"
          style={{
            background: '#FFD93D',
            border: '3px solid #000',
            boxShadow: '8px 8px 0px 0px #000',
          }}
        >
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: 54,
              height: 54,
              background: '#280736',
              border: '3px solid #000',
              boxShadow: '4px 4px 0px 0px #000',
            }}
          >
            <img src="/logo-icon.png" alt="SkyCode" className="w-full h-full object-cover animate-pulse" />
          </div>
          <div className="text-xl font-black uppercase tracking-tight text-black">SkyCode</div>
          <div className="text-xs font-black uppercase tracking-widest text-black/70">Loading Workspace…</div>
        </div>
      </div>
    );
  }

  return (
    <AppShell projectName={project.name}>
      <div className="flex flex-col md:grid h-auto md:h-[calc(100vh-95px)] md:grid-cols-[60px_280px_1fr] gap-3">
        {/* Left Sidebar */}
        <Sidebar
          active={sidebarView}
          onChange={setSidebarView}
          onRun={() => void runActiveFile()}
          isTerminalVisible={isTerminalVisible}
          onToggleTerminal={toggleTerminal}
        />

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
              onToggleTerminal={toggleTerminal}
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
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{
            background: 'var(--color-panel)',
            border: '3px solid var(--color-border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Unified Minimal Header Bar: File Tabs on Left, Language & Run on Right */}
          <div
            className="flex items-center justify-between px-2.5 py-1.5 shrink-0 select-none"
            style={{
              background: 'var(--color-surface)',
              borderBottom: '3px solid var(--color-border)',
            }}
          >
            {/* File Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-1 py-0.5">
              <FileTabs
                openFiles={openFiles.map((file) => file.path)}
                activeFile={activeFile}
                onSelect={setActiveFile}
                onClose={(filePath) =>
                  setOpenFiles((current) => current.filter((file) => file.path !== filePath))
                }
              />
            </div>

            {/* Right: Language Badge & Run Button */}
            <div className="flex items-center gap-2 shrink-0 pl-2">
              <span
                className="hidden sm:inline px-2.5 py-1 text-xs font-black uppercase tracking-widest"
                style={{
                  background: '#C4B5FD',
                  border: '2px solid #000',
                  boxShadow: '2px 2px 0px 0px #000',
                  color: '#000',
                }}
              >
                {project.language}
              </span>

              <button
                id="workspace-run-btn"
                onClick={() => void runActiveFile()}
                disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-wider transition-all duration-100 active:translate-x-[1px] active:translate-y-[1px]"
                style={{
                  background: '#FFD93D',
                  border: '2px solid #000',
                  boxShadow: '2px 2px 0px 0px #000',
                  color: '#000',
                  cursor: 'pointer',
                }}
                title="Run Code"
              >
                <Play size={12} strokeWidth={3} className="fill-black" />
                <span>{busy ? 'Running…' : 'Run'}</span>
              </button>
            </div>
          </div>

          {/* Main Editor View */}
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
                fontSize={dynamicCodeFontSize}
                theme={theme}
              />
            ) : (
              /* Empty state */
              <div
                className="grid h-full place-items-center text-center select-none p-6"
                style={{ background: 'var(--color-canvas)' }}
              >
                <div className="flex flex-col items-center gap-4">
                  <div
                    className="flex h-16 w-16 items-center justify-center overflow-hidden"
                    style={{
                      background: '#280736',
                      border: '3px solid #000',
                      boxShadow: '6px 6px 0px 0px #000',
                    }}
                  >
                    <img src="/logo-icon.png" alt="SkyCode" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-lg font-black uppercase tracking-tight" style={{ color: 'var(--color-text)' }}>
                      Build Something Great
                    </div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
                      Select a file from the explorer →
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resizable Terminal - Kept mounted to prevent null ref on 1st click and preserve terminal history */}
          <div
            style={{
              height: `${terminalHeight}px`,
              display: isTerminalVisible ? 'flex' : 'none',
            }}
            className="relative flex-col shrink-0"
          >
            {/* Resize handle */}
            <div
              onMouseDown={handleResizeMouseDown}
              className="group flex h-3 w-full cursor-ns-resize items-center justify-center select-none shrink-0"
              style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-surface)' }}
            >
              <div
                className="h-1 w-10 transition-colors"
                style={{ background: 'var(--color-border)', opacity: 0.4 }}
              />
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
                activeFile={activeFile || (tree && guessEntryFile(tree, project?.language ?? 'python'))}
                language={project?.language}
                onHide={() => setIsTerminalVisible(false)}
              />
            </div>
          </div>

          {/* Footer Status Bar */}
          <div
            className="flex items-center justify-between px-3.5 py-1.5 text-xs font-mono select-none shrink-0"
            style={{
              background: '#000',
              borderTop: '3px solid var(--color-border)',
              color: '#FFD93D',
            }}
          >
            <div className="flex items-center gap-4 font-bold uppercase tracking-wider text-[10px]">
              {!isTerminalVisible && (
                <button
                  id="footer-terminal-toggle"
                  onClick={toggleTerminal}
                  className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all"
                  style={{
                    background: '#FFD93D',
                    color: '#000',
                    border: '1px solid #000',
                    boxShadow: '1px 1px 0px 0px #000',
                  }}
                  title="Open Terminal"
                >
                  <Terminal size={11} strokeWidth={3} />
                  <span>Terminal</span>
                </button>
              )}
              <span>{
                project.language === 'python' ? 'Python 3.11.6'
                  : project.language === 'javascript' ? 'Node.js'
                  : project.language === 'c' ? 'GCC C17'
                  : project.language === 'java' ? 'JDK 21'
                  : project.language?.toUpperCase() || 'UTF-8'
              }</span>
              <span>UTF-8</span>
              <span>Spaces: 4</span>
            </div>
            <div className="flex items-center gap-1.5 font-black uppercase tracking-widest text-[10px]">
              <Cloud size={12} strokeWidth={3} />
              <span>Synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Path Dialog Modal */}
      {pathDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
        >
          <div
            className="w-full max-w-md"
            style={{
              background: 'var(--color-panel)',
              border: '3px solid var(--color-border)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Modal header */}
            <div
              className="px-5 py-4"
              style={{
                background: '#FFD93D',
                borderBottom: '3px solid var(--color-border)',
              }}
            >
              <div className="text-sm font-black uppercase tracking-widest text-black">
                {pathDialog.title}
              </div>
            </div>

            {/* Modal body */}
            <div className="p-5">
              <input
                id="path-dialog-input"
                autoFocus
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); void submitPathDialog(); }
                  if (e.key === 'Escape') { setPathDialog(null); setPathInput(''); }
                }}
                placeholder={pathDialog.mode === 'rename' ? 'Enter new path' : pathDialog.mode === 'create-folder' ? 'e.g. components or pages' : 'e.g. src/main.py'}
                className="nb-input"
              />

              {/* Option to move selected file into newly created folder */}
              {pathDialog.mode === 'create-folder' && pathDialog.selectedFile && (
                <div className="mt-3 p-3 rounded border-2 border-black/20 bg-sky-50 dark:bg-sky-950/40 flex flex-col gap-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-black dark:text-white select-none">
                    <input
                      type="checkbox"
                      checked={pathDialogSaveSelectedFile}
                      onChange={(e) => setPathDialogSaveSelectedFile(e.target.checked)}
                      className="w-4 h-4 accent-[#0284C7] rounded cursor-pointer"
                    />
                    <span>
                      Save selected file <span className="font-mono text-sky-600 dark:text-sky-400 font-bold underline">{pathDialog.selectedFileName}</span> inside this folder
                    </span>
                  </label>
                  {pathDialogSaveSelectedFile && pathInput.trim() && (
                    <div className="text-[11px] font-mono text-black/70 dark:text-white/70 pl-6">
                      → Will save to: <span className="text-[#0284C7] dark:text-[#38BDF8] font-bold">{pathInput.trim().replace(/\/+$/, '')}/{pathDialog.selectedFileName}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  id="path-dialog-cancel"
                  onClick={() => { setPathDialog(null); setPathInput(''); }}
                  className="nb-btn-ghost"
                >
                  Cancel
                </button>
                <button
                  id="path-dialog-confirm"
                  onClick={() => void submitPathDialog()}
                  disabled={pathDialogBusy || !pathInput.trim()}
                  className="nb-btn"
                >
                  {pathDialogBusy ? 'Saving…' : pathDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
