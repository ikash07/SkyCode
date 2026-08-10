# SkyCode — Online IDE

Production-oriented cloud IDE with a VS Code-like experience, Monaco editor, file explorer, tabs, terminal output, project dashboard, authentication, MongoDB persistence, and Docker-based code execution for Python, C, and Java.

## Layout

- `frontend`: React + Vite + Tailwind + Monaco UI
- `backend`: Express + MongoDB + Docker execution service
- `docker`: Runtime and deployment Docker assets
- `deploy`: Production deployment configs (PM2, Nginx, setup scripts)

## Run Locally

1. Start MongoDB (local or Atlas).
2. Copy `backend/.env.example` to `backend/.env` and adjust values.
3. Install dependencies at the repo root:
   ```bash
   npm install
   ```
4. Run both frontend and backend:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:5173](http://localhost:5173)

## Deploy to Production (100% Free)

SkyCode can be deployed for free using:

| Service | Role | Free Tier |
|---------|------|-----------|
| **Netlify** | Frontend hosting | Unlimited static sites |
| **Oracle Cloud** | Backend + code execution | Always Free ARM64 VM |
| **MongoDB Atlas** | Database | 512 MB free cluster |

**Full deployment guide:** See [`deploy/README-DEPLOY.md`](deploy/README-DEPLOY.md)

### Quick Architecture

```
Netlify (Frontend) → HTTPS → Oracle Cloud VM (Backend + Docker) → MongoDB Atlas
```

### Environment Variables

**Frontend (Netlify):**
| Variable | Example |
|----------|---------|
| `VITE_API_URL` | `https://api.yourdomain.com/api` |

**Backend (Oracle VM):**
| Variable | Example |
|----------|---------|
| `PORT` | `4000` |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://...` |
| `JWT_SECRET` | `random-64-char-string` |
| `CLIENT_ORIGIN` | `https://your-app.netlify.app` |

## Notes

- Project files are persisted in MongoDB and mirrored to disk under `backend/storage/projects`.
- Each execution runs in an isolated Docker container with CPU, memory, and time limits.
- Python dependency installation is best-effort: missing imports are detected and installed into an execution cache before rerunning.
- When Docker is unavailable, code executes directly via local compilers (less secure — ensure Docker is running in production).
