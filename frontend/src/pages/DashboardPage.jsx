import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProjectRequest, deleteProjectRequest, listProjectsRequest } from '../api/projects';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../hooks/useThemeMode';
import {
  MoonStar, SunMedium, Plus, ExternalLink, Code2, Terminal,
  Server, Trash2, LogOut, Star, Zap, Activity, Clock, ArrowRight,
} from 'lucide-react';

/* ── Language config ── */
const LANG_CONFIG = {
  python:     { label: 'Python',     bg: '#C4B5FD', icon: Code2 },
  javascript: { label: 'JavaScript', bg: '#FFD93D', icon: Code2 },
  c:          { label: 'C',          bg: '#93C5FD', icon: Terminal },
  java:       { label: 'Java',       bg: '#FCA5A5', icon: Server },
};

const getLang = (lang) =>
  LANG_CONFIG[lang?.toLowerCase()] ?? { label: lang ?? 'Code', bg: '#D1D5DB', icon: Code2 };

const formatTimeAgo = (dateString) => {
  if (!dateString) return 'recently';
  const diff = Math.floor((Date.now() - new Date(dateString)) / 60000);
  if (diff < 1)   return 'just now';
  if (diff < 60)  return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

/* ── Stat card ── */
function StatCard({ value, label, color = '#FFD93D', rotate = 0 }) {
  return (
    <div
      className="flex flex-col items-center justify-center p-5 text-center"
      style={{
        background: color,
        border: '3px solid #000',
        boxShadow: '6px 6px 0px 0px #000',
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <div className="text-3xl font-black leading-none text-black">{value}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-widest text-black/70">{label}</div>
    </div>
  );
}

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
    try { setProjects(await listProjectsRequest()); }
    catch (err) { console.error(err); }
  };

  useEffect(() => { void loadProjects(); }, []);

  const createProject = async () => {
    if (!name.trim()) { setError('Project name is required'); return; }
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

  const displayName = user?.displayName || 'Developer';

  return (
    <div
      className="relative min-h-screen"
      style={{ background: 'var(--color-canvas)' }}
    >
      {/* ── Background grid ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage:
            'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-6 flex flex-col gap-6">

        {/* ── Top Header ── */}
        <header
          className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
          style={{
            background: 'var(--color-panel)',
            border: '3px solid var(--color-border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 no-underline group cursor-pointer" title="SkyCode Dashboard">
            <div className="nb-logo-box" style={{ width: 44, height: 44 }}>
              <img
                src="/logo-icon.png"
                alt="SkyCode"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-black uppercase tracking-tight" style={{ color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                SkyCode
              </span>
              <span className="nb-label" style={{ marginTop: 2 }}>Online IDE</span>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              id="dashboard-theme-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="nb-btn-icon"
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === 'dark'
                ? <SunMedium size={17} strokeWidth={3} />
                : <MoonStar size={17} strokeWidth={3} />}
            </button>

            <button
              id="dashboard-logout-btn"
              onClick={logout}
              className="nb-btn-ghost"
              title="Sign out"
            >
              <LogOut size={15} strokeWidth={3} />
              Sign Out
            </button>
          </div>
        </header>

        {/* ── Hero greeting ── */}
        <div
          className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-8 overflow-hidden"
          style={{
            background: '#000',
            border: '3px solid #000',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Dot pattern overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
              backgroundSize: '18px 18px',
              opacity: 0.04,
            }}
          />

          <div className="relative">
            <div
              className="mb-3 inline-flex items-center gap-2 px-3 py-1"
              style={{ background: '#FFD93D', border: '2px solid #FFD93D' }}
            >
              <Zap size={12} strokeWidth={3} fill="#000" color="#000" />
              <span className="text-xs font-black uppercase tracking-widest text-black">
                Welcome back
              </span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-black uppercase leading-none"
              style={{ color: '#FFFDF5', letterSpacing: '-0.03em' }}
            >
              {displayName}
            </h1>
            <p className="mt-2 font-bold text-sm uppercase tracking-widest" style={{ color: '#aaa' }}>
              Your projects · Your code · Anywhere
            </p>
          </div>

          {/* Decorative star */}
          <div className="flex items-center gap-4 z-10 shrink-0">
            <Star
              size={44}
              strokeWidth={2.5}
              fill="#FFD93D"
              color="#FFD93D"
              className="nb-spin-slow hidden sm:block"
              style={{ flexShrink: 0 }}
            />
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          <StatCard value={projects.length} label="Projects" color="#FFD93D" rotate={-1} />
          <StatCard value="28" label="Runs" color="#C4B5FD" rotate={0.5} />
          <StatCard value="99.9%" label="Uptime" color="#6BCB77" rotate={-0.5} />
        </div>

        {/* ── Two-column layout ── */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* ── Create project panel ── */}
          <div
            className="flex flex-col"
            style={{
              background: 'var(--color-panel)',
              border: '3px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Panel header */}
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{
                background: '#FF6B6B',
                borderBottom: '3px solid var(--color-border)',
              }}
            >
              <Plus size={20} strokeWidth={3} color="#fff" />
              <span className="font-black text-sm uppercase tracking-widest text-white">
                New Project
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="proj-name"
                  className="nb-label mb-2 block"
                >
                  Project Name *
                </label>
                <input
                  id="proj-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="my-awesome-project"
                  className="nb-input"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="proj-desc" className="nb-label mb-2 block">
                  Description
                </label>
                <input
                  id="proj-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you building?"
                  className="nb-input"
                />
              </div>

              {/* Language */}
              <div>
                <label htmlFor="proj-lang" className="nb-label mb-2 block">
                  Language
                </label>
                <div className="relative">
                  <select
                    id="proj-lang"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="nb-select"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="c">C Language</option>
                    <option value="java">Java</option>
                  </select>
                  {/* Custom arrow */}
                  <span
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-black text-xs"
                    style={{ color: 'var(--color-text)' }}
                  >
                    ▼
                  </span>
                </div>
              </div>

              {error && (
                <div className="nb-error-box nb-in">
                  ⚠ {error}
                </div>
              )}

              <button
                id="create-project-btn"
                onClick={() => void createProject()}
                disabled={busy || !name.trim()}
                className="nb-btn w-full mt-auto"
                style={{ height: 52 }}
              >
                <Plus size={18} strokeWidth={3} />
                {busy ? 'Creating…' : 'Create Project'}
                <ArrowRight size={16} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* ── Recent projects panel ── */}
          <div
            className="flex flex-col"
            style={{
              background: 'var(--color-panel)',
              border: '3px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{
                background: '#FFD93D',
                borderBottom: '3px solid var(--color-border)',
              }}
            >
              <div className="flex items-center gap-3">
                <Activity size={20} strokeWidth={3} color="#000" />
                <span className="font-black text-sm uppercase tracking-widest text-black">
                  Recent Projects
                </span>
              </div>
              <span
                className="font-black text-xs uppercase tracking-wider text-black underline cursor-pointer"
              >
                View all
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px]">
              {projects.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-3 p-6 text-center">
                  <div
                    style={{
                      border: '3px dashed var(--color-border)',
                      padding: '24px 32px',
                      boxShadow: 'none',
                    }}
                  >
                    <div
                      className="mx-auto mb-2 flex h-12 w-12 items-center justify-center overflow-hidden"
                      style={{
                        background: '#280736',
                        border: '2px solid #000',
                        boxShadow: '3px 3px 0px 0px #000',
                      }}
                    >
                      <img src="/logo-icon.png" alt="SkyCode" className="h-full w-full object-cover" />
                    </div>
                    <p className="font-black text-sm uppercase tracking-wide" style={{ color: 'var(--color-text)' }}>
                      No projects yet.
                    </p>
                    <p className="font-bold text-xs mt-1" style={{ color: 'var(--color-muted)' }}>
                      Create your first one →
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="divide-y-2 divide-black">
                  {projects.map((proj) => {
                    const lang = getLang(proj.language);
                    const Icon = lang.icon;
                    return (
                      <li key={proj._id}>
                        <Link
                          to={`/projects/${proj._id}`}
                          className="group flex items-center justify-between px-5 py-4 transition-colors duration-100"
                          style={{ background: 'var(--color-panel)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#FFFBEC')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-panel)')}
                        >
                          <div className="flex items-center gap-3">
                            {/* Lang badge */}
                            <div
                              style={{
                                width: 42, height: 42,
                                background: lang.bg,
                                border: '2px solid #000',
                                boxShadow: '3px 3px 0px 0px #000',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Icon size={18} strokeWidth={3} color="#000" />
                            </div>
                            <div>
                              <div className="font-black text-sm uppercase" style={{ color: 'var(--color-text)' }}>
                                {proj.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="nb-badge"
                                  style={{ background: lang.bg, fontSize: '0.6rem' }}
                                >
                                  {lang.label}
                                </span>
                                <span
                                  className="flex items-center gap-1 text-xs font-bold uppercase"
                                  style={{ color: 'var(--color-muted)' }}
                                >
                                  <Clock size={10} strokeWidth={3} />
                                  {formatTimeAgo(proj.updatedAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              id={`delete-project-${proj._id}`}
                              onClick={(e) => void removeProject(proj._id, e)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{
                                background: '#FF6B6B',
                                border: '2px solid #000',
                                boxShadow: '3px 3px 0px 0px #000',
                                padding: 6, cursor: 'pointer',
                                color: '#fff',
                              }}
                              title="Delete project"
                              aria-label="Delete project"
                            >
                              <Trash2 size={14} strokeWidth={3} />
                            </button>
                            <ExternalLink
                              size={16}
                              strokeWidth={3}
                              style={{ color: 'var(--color-muted)' }}
                            />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom CTA strip ── */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5"
          style={{
            background: '#C4B5FD',
            border: '3px solid #000',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div>
            <div className="font-black text-lg uppercase tracking-tight text-black">
              Ready to build something?
            </div>
            <div className="font-bold text-sm text-black/60 uppercase tracking-wide">
              Code, run, and deploy in seconds.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Star size={20} strokeWidth={2.5} fill="#000" color="#000" />
            <button
              onClick={() => document.getElementById('proj-name')?.focus()}
              className="nb-btn"
              style={{ background: '#000', color: '#FFD93D' }}
            >
              Start Coding
              <ArrowRight size={16} strokeWidth={3} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
