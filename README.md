# Online IDE

Production-oriented cloud IDE with a VS Code-like experience, Monaco editor, file explorer, tabs, terminal output, project dashboard, authentication, MongoDB persistence, and Docker-based code execution for Python, C, and Java.

## Layout

- `frontend`: React + Vite + Tailwind + Monaco UI
- `backend`: Express + MongoDB + Docker execution service
- `docker`: Runtime and deployment Docker assets

## Run locally

1. Start MongoDB.
2. Copy `backend/.env.example` to `backend/.env` and adjust values.
3. Install dependencies at the repo root.
4. Run `npm run dev`.

## Notes

- Project files are persisted in MongoDB and mirrored to disk under `backend/storage/projects`.
- Each execution runs in an isolated Docker container with CPU, memory, and time limits.
- Python dependency installation is best-effort: missing imports are detected and installed into an execution cache before rerunning.
- When deploying the backend in Docker, mount the host Docker socket so the API can launch short-lived execution containers.
