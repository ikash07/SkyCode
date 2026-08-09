import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createProjectRequest, deleteProjectRequest, listProjectsRequest } from '../api/projects';
import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('python');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const loadProjects = async () => {
    setProjects(await listProjectsRequest());
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

  const removeProject = async (projectId) => {
    if (!window.confirm('Delete this project?')) return;
    await deleteProjectRequest(projectId);
    await loadProjects();
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-3 py-4">
      <section className="glass-panel shell-shadow rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-[var(--color-muted)]">Dashboard</div>
            <h1 className="mt-2 text-3xl font-semibold">Welcome, {user?.displayName}</h1>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Create a project and launch straight into an IDE workspace.</p>
          </div>
          <button onClick={logout} className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm">Sign out</button>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-[1.1fr_1fr_180px_auto]">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" className="rounded-2xl border border-[var(--color-border)] bg-black/10 px-4 py-3 outline-none" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Description" className="rounded-2xl border border-[var(--color-border)] bg-black/10 px-4 py-3 outline-none" />
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-2xl border border-[var(--color-border)] bg-black/10 px-4 py-3 outline-none">
            <option value="python">Python</option>
            <option value="c">C</option>
            <option value="java">Java</option>
          </select>
          <button onClick={() => void createProject()} disabled={busy || !name.trim()} className="rounded-2xl bg-[var(--color-accent)] px-4 py-3 font-medium text-white disabled:opacity-60">{busy ? 'Creating...' : 'Create project'}</button>
        </div>
        {error ? <div className="mt-4 rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">{error}</div> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <article key={project._id} className="glass-panel shell-shadow rounded-3xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">{project.name}</h2>
                <div className="mt-1 text-sm text-[var(--color-muted)]">{project.description || 'No description'}</div>
              </div>
              <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-medium text-[var(--color-accent)] uppercase">{project.language}</span>
            </div>
            <div className="mt-5 flex items-center justify-between text-sm text-[var(--color-muted)]">
              <span>Autosave {project.settings.autoSave ? 'on' : 'off'}</span>
              <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
            <div className="mt-5 flex gap-2">
              <Link to={`/projects/${project._id}`} className="rounded-2xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white">Open</Link>
              <button onClick={() => void removeProject(project._id)} className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm">Delete</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
