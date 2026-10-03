# SkyCode — Neo-Brutalism Overhaul & System Backup

> **Date:** October 3, 2026  
> **Status:** Fully Tested, Built, and Verified (Production Ready)  
> **Theme:** Neo-Brutalism (DesignPrompts style: hard borders, offset drop shadows, cream/dark canvas, pop colors, Space Grotesk/Mono typography)

---

## 1. System Overview & Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS 3, Monaco Editor (`@monaco-editor/react`), xterm.js, Lucide Icons |
| **Backend** | Node.js (ESM), Express 4, WebSocket (`ws`), MongoDB + Mongoose, Docker Runner / Local Runner |
| **Monorepo** | npm workspaces (`frontend`, `backend`) |
| **Design Language** | Neo-Brutalism (`border-2 border-black`, `shadow-[4px_4px_0px_#000]`, high contrast, raw geometry) |

---

## 2. Design System Tokens (`frontend/src/index.css`)

### Color Palette
- **Canvas / Background:** `#FFFDF5` (Warm Cream in light mode) / `#121212` (Dark mode)
- **Panels & Surfaces:** `#FFFFFF` (White) / `#1E1E1E` (Dark panel)
- **Primary / Borders:** `#000000` (Solid Black 2px–3px)
- **Secondary Accent:** `#FFD93D` (Vivid Cyber Yellow)
- **Accent / Danger:** `#FF6B6B` (Hot Punch Red)
- **Tertiary Accent:** `#C4B5FD` (Soft Lavender Violet)
- **Success Accent:** `#6BCB77` (Electric Mint Green)

### Shadow System (Hard Offsets)
- `nb-shadow-sm`: `4px 4px 0px #000000`
- `nb-shadow`: `6px 6px 0px #000000`
- `nb-shadow-lg`: `8px 8px 0px #000000`
- **Active Click State:** `translate(2px, 2px)` with reduced offset or flat contact shadow.

### Typography
- **Headings & UI:** `Space Grotesk`, sans-serif (Weights: 400, 500, 700, 900)
- **Code & Terminal:** `Space Mono`, monospace (Weights: 400, 700)
- Google Fonts preconnected in `index.html` and imported at root CSS.

---

## 3. Component Modifications Log

### Layout & Navigation
1. **[AppShell.jsx](file:///c:/ishowspeed/Project-1/frontend/src/components/layout/AppShell.jsx)**
   - Replaced gradient headers with cream/black high-contrast navigation bar.
   - SkyCode brand badge: yellow pill with thick black border and hard shadow.
   - Added live server status indicator with pulsing dot.
   - Theme toggle button with tactile press feedback.

2. **[Sidebar.jsx](file:///c:/ishowspeed/Project-1/frontend/src/components/layout/Sidebar.jsx)**
   - Hard right border (`border-r-2 border-black`).
   - High-contrast icon buttons with tooltips, active yellow highlight, and offset click animation.

### Pages
3. **[WorkspacePage.jsx](file:///c:/ishowspeed/Project-1/frontend/src/pages/WorkspacePage.jsx)**
   - Neo-brutalist status banner, pane dividers, alert notifications, and sharp pane boundaries.
   - Clean resizable pane styling with solid black dividing rails.
   - **Minimal Single Header Bar**: Replaced the stacked duplicate toolbars (`← TEST` row + tabs row) with a single, sleek bar combining open file tabs on the left with the language badge and `[▶ RUN]` button on the right.
   - **Minimal White Code Editor**: Clean, minimal pure `#FFFFFF` white canvas with subtle `#9CA3AF` line numbers, `#111827` dark text, Space Mono typography, and yellow selection highlight.
   - **Instant 1st-Click Code Execution**: Persistent BottomPanel DOM mount (`display: isTerminalVisible ? 'flex' : 'none'`) preventing null terminal refs, auto-saving dirty buffers before execution, and synchronously forwarding target files to the execution pipeline.
   - **Window-Responsive Code Font Sizing**: Dynamic viewport width listener automatically scaling Monaco font sizes from 11px on small screens to 16px on ultrawide displays with Monaco `.layout()` synchronization and `mouseWheelZoom` enabled.


4. **[DashboardPage.jsx](file:///c:/ishowspeed/Project-1/frontend/src/pages/DashboardPage.jsx)**
   - Neo-Brutalist project cards with 6px offset drop shadows.
   - Language tags styled as vibrant pastel pills (`#FFD93D`, `#C4B5FD`, `#6BCB77`, `#FF6B6B`).
   - Create project modal with thick borders, chunky input fields, and punchy buttons.

5. **[AuthPage.jsx](file:///c:/ishowspeed/Project-1/frontend/src/pages/AuthPage.jsx)**, **[LoginPage.jsx](file:///c:/ishowspeed/Project-1/frontend/src/pages/LoginPage.jsx)**, **[RegisterPage.jsx](file:///c:/ishowspeed/Project-1/frontend/src/pages/RegisterPage.jsx)**
   - Centered card container with 8px hard offset shadow (`shadow-[8px_8px_0px_#000]`).
   - Chunky text inputs with black borders and yellow focus ring.
   - Solid full-width CTA button with hover offset.

### Editor Panels
6. **[Explorer.jsx](file:///c:/ishowspeed/Project-1/frontend/src/components/editor/Explorer.jsx)**
   - File tree with sharp icons, indent guides, and high-contrast file selection state.
   - Quick action bar: New File, New Folder, Upload, and dedicated Terminal toggle button.

7. **[SearchPanel.jsx](file:///c:/ishowspeed/Project-1/frontend/src/components/editor/SearchPanel.jsx)** & **[SettingsPanel.jsx](file:///c:/ishowspeed/Project-1/frontend/src/components/editor/SettingsPanel.jsx)**
   - Thick bordered inputs, case/regex toggle switches, and font/editor configuration toggles.

8. **[FileTabs.jsx](file:///c:/ishowspeed/Project-1/frontend/src/components/editor/FileTabs.jsx)**
   - Physical tab card design with active tab highlighted in cream/white with top indicator.

9. **[BottomPanel.jsx](file:///c:/ishowspeed/Project-1/frontend/src/components/editor/BottomPanel.jsx)** & **[TerminalPanel.jsx](file:///c:/ishowspeed/Project-1/frontend/src/components/editor/TerminalPanel.jsx)**
   - **Unified Single Panel Header Bar**: Eliminated the disjointed dark sub-bar (#161B22) and thin dark borders (#30363D). Integrated all controls directly into the single top tab bar:
     * Left: Neo-Brutalist tab pills with 2px solid black borders and 2px hard offset shadows (Active `#FFD93D` yellow, inactive cream).
     * Right: `[ ● READY ]` pill with 2px black border, punchy `[ ▶ RUN ]` yellow / `[ ⏹ STOP ]` red button, minimal `[ 🗑 ]` clear button, and `[ ✕ ]` close button.
   - **Organic Neo-Brutalism Terminal Viewport**:
     * Pure `#000000` deep black background matching the bottom status bar and system borders.
     * Vibrant SkyCode Yellow (`#FFD93D`) shell prompt `skycode@workspace:~/my-app$ ` in bold typography.
     * Crisp White (`#FFFDF5`) executed commands and stdout stream in `Space Mono`.
     * Electric Mint Green (`#6BCB77`) exit/done indicator and active stdin pulse prompt (`>`).
     * Hot Coral Red (`#FF6B6B`) error and stderr stream.
     * Active blinking yellow cursor (`caret-[#FFD93D]`).
     * Zero duplicate sub-bars and zero double-borders.
   - **Output & Problems Panes**: Matched with pure `#000000` background and Space Mono typography.
   - **Sidebar & Explorer**: Dedicated Terminal toggle icon with active indicator and status bar restore pill when hidden.

---

## 4. Diagnostics & Testing Verification

### PostCSS & CSS Ordering Fix
- **Issue:** `@import must precede all other statements (besides @charset or empty @layer)` caused by `@import url(...)` placed below `@tailwind` directives.
- **Fix:** Moved `@import` directly to line 1 of `frontend/src/index.css`.
- **Outcome:** Clean Vite processing with 0 warnings/errors.

### Production Build Test
```bash
npm run build --workspace frontend
```
**Output:**
```
✓ 1665 modules transformed.
dist/index.html                   1.00 kB │ gzip:  0.54 kB
dist/assets/index-qG9WiLq8.css   22.20 kB │ gzip:  5.30 kB
dist/assets/index-C-29W_m3.js   305.87 kB │ gzip: 95.66 kB
✓ built in 9.94s (Exit code: 0)
```

### Backend & API Verification
```bash
node backend/src/index.js
```
- **Port:** HTTP listening on `http://localhost:4000`
- **WebSocket:** Terminal active on `ws://localhost:4000/ws/terminal`
- **Database:** MongoDB connected successfully
- **Health Check (`GET http://localhost:4000/api/health`):**
  ```json
  {
    "status": "ok",
    "message": "OK",
    "ok": true,
    "service": "online-ide-backend",
    "database": "connected"
  }
  ```

---

## 5. Quick Start Instructions

### Development (Both Services)
```bash
# From workspace root:
npm run dev
```
- Frontend starts on: `http://localhost:5173`
- Backend starts on: `http://localhost:4000`

### Individual Services
```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend
```
