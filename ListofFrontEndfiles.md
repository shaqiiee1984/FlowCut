# Frontend Files List

All HTML, CSS, and JS/JSX files in the Flow_Cut project (excluding `node_modules`).

---

## React Source Files (`frontend/src/`)

| File | Type | Description |
|------|------|-------------|
| `frontend/src/main.jsx` | JSX | React app entry point |
| `frontend/src/App.jsx` | JSX | Main app shell & tab orchestration |
| `frontend/src/App.css` | CSS | Global stylesheet (dark glassmorphic theme) |
| `frontend/src/index.css` | CSS | Base index styles (empty, managed in App.css) |
| `frontend/src/components/TabsNavigation.jsx` | JSX | Tab switching header component |
| `frontend/src/components/SilenceRemovalTab.jsx` | JSX | Silence removal parameters & actions |
| `frontend/src/components/CombineClipsTab.jsx` | JSX | Combine clips controls & player |
| `frontend/src/components/ExtractCaptionsTab.jsx` | JSX | Whisper transcription controls |
| `frontend/src/components/VideoPreviewPlayer.jsx` | JSX | Reusable video preview player |
| `frontend/src/components/LogTerminal.jsx` | JSX | Scrolling execution log terminal |

---

## Vite Config

| File | Type | Description |
|------|------|-------------|
| `frontend/vite.config.js` | JS | Vite build configuration (base: `/static/`) |
| `frontend/index.html` | HTML | Vite dev entry HTML template |

---

## Compiled Production Assets (`static/assets/`)

| File | Type | Description |
|------|------|-------------|
| `static/assets/index-BiKzUnkj.js` | JS | Compiled React bundle (production) |
| `static/assets/index-CnW0gOEH.css` | CSS | Compiled CSS bundle (production) |

---

## Flask Template (`templates/`)

| File | Type | Description |
|------|------|-------------|
| `templates/index.html` | HTML | Flask-served HTML (loads compiled React bundles) |
