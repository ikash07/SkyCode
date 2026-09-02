import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProjectRequest, deleteProjectRequest, listProjectsRequest } from '../api/projects';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../hooks/useThemeMode';
import { Rocket, MoonStar, SunMedium, Plus, ExternalLink, Code2, Terminal, Server, Trash2, LogOut } from 'lucide-react';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useThemeMode();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('python');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const loadProjects = async () => {
    try {
      setProjects(await listProjectsRequest());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const createProject = async () => {
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const project = await createProjectRequest({ name, description, language });
      navigate(`/projects/${project._id}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to create project');
    } finally {
      setBusy(false);
    }
  };

  const removeProject = async (projectId, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('Delete this project?')) return;
    await deleteProjectRequest(projectId);
    await loadProjects();
  };

  const getLanguageBadge = (lang) => {
    switch (lang?.toLowerCase()) {
      case 'python':
        return { bg: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: <Code2 size={18} /> };
      case 'c':
        return { bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20', icon: <Terminal size={18} /> };
      case 'java':
        return { bg: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: <Server size={18} /> };
      default:
        return { bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: <Code2 size={18} /> };
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return 'recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMin = Math.floor((now - date) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `Updated ${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Updated ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Updated ${diffDays}d ago`;
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      {/* Top Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="skycode-logo-glow flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f8cff] to-[#7c3aed] shrink-0">
            <Rocket size={20} className="text-white drop-shadow-lg" />
          </div>
          <span className="skycode-gradient-text text-xl md:text-2xl font-bold tracking-wide">SkyCode</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] transition hover:bg-white/10"
            title="Toggle theme"
          >
            {theme === 'dark' ? <MoonStar size={18} /> : <SunMedium size={18} />}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs md:text-sm font-semibold text-[var(--color-muted)] hover:text-[var(--color-text)]"
            title="Sign out"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* Greeting Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-text)]">
          Welcome back, {user?.displayName || 'Developer'} 👋
        </h1>
        <p className="mt-1 text-xs md:text-sm text-[var(--color-muted)] font-medium">
          Your projects. Your code. Anywhere.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Create new project */}
        <div className="glass-panel shell-shadow flex flex-col justify-between rounded-3xl p-6 border border-[var(--color-border)]">
          <div>
            <h2 className="text-base md:text-lg font-bold tracking-wide text-[var(--color-text)]">Create new project</h2>
            
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs md:text-sm font-semibold text-[var(--color-muted)]">Project name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-awesome-project"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs md:text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] placeholder:text-[var(--color-muted)]/60"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs md:text-sm font-semibold text-[var(--color-muted)]">Description</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you building?"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs md:text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] placeholder:text-[var(--color-muted)]/60"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs md:text-sm font-semibold text-[var(--color-muted)]">Language</label>
                <div className="relative">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs md:text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-accent)] cursor-pointer"
                  >
                    <option value="python" className="bg-[var(--color-canvas)] text-[var(--color-text)]">Python</option>
                    <option value="c" className="bg-[var(--color-canvas)] text-[var(--color-text)]">C Language</option>
                    <option value="java" className="bg-[var(--color-canvas)] text-[var(--color-text)]">Java</option>
                  </select>
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5 rounded-full bg-blue-400"></span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3 text-xs md:text-sm text-[var(--color-danger)] font-medium">
                  {error}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => void createProject()}
            disabled={busy || !name.trim()}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4f8cff] to-[#7c3aed] py-3 text-xs md:text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:opacity-50"
          >
            <Plus size={18} />
            {busy ? 'Creating...' : 'Create Project'}
          </button>
        </div>

        {/* Right Column: Recent projects */}
        <div className="glass-panel shell-shadow flex flex-col rounded-3xl p-6 border border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-bold tracking-wide text-[var(--color-text)]">Recent projects</h2>
            <span className="text-xs md:text-sm text-[var(--color-accent)] font-semibold hover:underline cursor-pointer">View all</span>
          </div>

          <div className="mt-4 flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-1">
            {projects.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] p-4 text-center text-xs md:text-sm text-[var(--color-muted)] font-medium">
                No projects yet. Create your first project on the left!
              </div>
            ) : (
              projects.map((proj) => {
                const badge = getLanguageBadge(proj.language);
                return (
                  <Link
                    key={proj._id}
                    to={`/projects/${proj._id}`}
                    className="group flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition hover:border-[var(--color-accent)]/50 hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${badge.bg} shrink-0`}>
                        {badge.icon}
                      </div>
                      <div>
                        <div className="text-xs md:text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent)]">
                          {proj.name}
                        </div>
                        <div className="text-xs text-[var(--color-muted)] mt-0.5 font-medium">
                          <span className="capitalize">{proj.language}</span>
                          <span className="mx-1.5">•</span>
                          <span>{formatTimeAgo(proj.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => void removeProject(proj._id, e)}
                        className="rounded-lg p-2 text-[var(--color-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-400"
                        title="Delete project"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ExternalLink size={16} className="text-[var(--color-muted)] transition group-hover:text-[var(--color-text)]" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel shell-shadow rounded-2xl p-4 md:p-5 border border-[var(--color-border)] text-center">
          <div className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">{projects.length}</div>
          <div className="text-xs md:text-sm text-[var(--color-muted)] font-semibold mt-1">Projects</div>
        </div>

        <div className="glass-panel shell-shadow rounded-2xl p-4 md:p-5 border border-[var(--color-border)] text-center">
          <div className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">28</div>
          <div className="text-xs md:text-sm text-[var(--color-muted)] font-semibold mt-1">Runs this week</div>
        </div>

        <div className="glass-panel shell-shadow rounded-2xl p-4 md:p-5 border border-[var(--color-border)] text-center">
          <div className="text-2xl md:text-3xl font-bold text-emerald-400">99.9%</div>
          <div className="text-xs md:text-sm text-[var(--color-muted)] font-semibold mt-1">Uptime</div>
        </div>
      </div>
    </div>
  );
}
