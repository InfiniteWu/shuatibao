# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend
npm install              # Install frontend dependencies
npm run dev              # Start Vite dev server on port 3000
npm run build            # TypeScript check + Vite production build
npm run preview          # Preview production build locally

# Backend (from server/ directory)
cd server && python app.py           # Start Flask on port 8008
pip install -r requirements.txt      # Install backend dependencies

# Excel → JSON conversion
python xlsx2json.py <file.xlsx> [output_name]   # Generic 4-column format
python convert_xlsx.py                            # Specific format (安环2026)

# PyInstaller packaging
python build.py         # Build frontend + package into single exe
```

There is **no test suite** in this project.

## Architecture

This is a **single-page quiz practice app** with a React 19 frontend and a Python Flask + SQLite backend, designed to be packaged into a standalone Windows exe.

### Data flow

1. User identity is tracked via `X-User-Id` HTTP header, stored in `localStorage` as `userId` (integer 0–99). The `userStore` Zustand store manages login/logout.
2. Frontend calls `/api/*` via a thin fetch wrapper (`src/api/client.ts`) that auto-attaches the `X-User-Id` header.
3. Flask serves RESTful JSON APIs using Blueprint-organized routes under `server/routes/`. Each route file contains related endpoints and imports `get_db()` from `server/db.py` for SQLite access.
4. The `questions` table stores `options` and `answer` as **JSON strings** (not normalized columns) — `json.loads()` is used on every read, `json.dumps()` on every write.
5. In production, Flask also serves the compiled frontend from `dist/` via a catch-all static route.

### Routing

- `/login` — user ID selection (standalone, no layout wrapper)
- All other routes are wrapped in `<Layout />` (shared sidebar/header)
- `/practice/:bankId/session` — the active quiz UI; this page uses `practiceStore` which **persists progress to localStorage** (`practiceSavedState`) on every answer change, enabling session recovery within 24 hours
- `/result/:sessionId` — post-submission review; `HistoryPage` exists but is **commented out** in `App.tsx`

### Practice flow

1. `PracticeConfigPage`: user selects question type counts and settings → `POST /api/practice/pick` returns a question set
2. `PracticeSessionPage`: user answers questions one by one; `practiceStore` tracks `answerMap` (questionId → {selected, isCorrect}) and persists to localStorage
3. Client-side answer checking: compares selected answer against question.answer, then `POST /api/practice/submit` records the session and all answers to the DB
4. `ResultPage`: fetches `GET /api/practice/sessions/:id` to display full session detail

### Backend patterns

- Every route module creates a `Blueprint` registered in `server/app.py` with `url_prefix='/api'`
- `server/db.py` provides `get_db()` (connect + PRAGMA foreign_keys) and `init_db()` (create tables + seed 100 users). Only `init_db()` is called at startup; routes call `get_db()` per-request.
- `server/import_parser.py` validates imported JSON structure; `do_import()` handles the actual `INSERT` + `recount_bank()` transaction
- `server/routes/records.py` exists but is registered and handles writing wrong_book entries on wrong answers

### Portable deployment

The `Portable/` directory (not tracked in git) contains a self-contained deployment:
- Embedded Python 3.14 (embeddable zip) + installed pip/flask
- Server source code + frontend `dist/` output
- `tools/` with xlsx2json and convert_xlsx scripts
- Designed for copy-to-any-Windows-machine without installing Python or Node.js

### Notable configuration mismatches

- **Vite dev proxy**: `vite.config.ts` proxies `/api` to `localhost:5000`, but Flask runs on **8008**. When developing with the Vite dev server, you must either start Flask on port 5000 (`python app.py` → change the port in code) or update the proxy target.
- **Portable uses a different Python version** (3.14) than the main project likely uses. The embeddable Python requires special handling of `python314._pth` and sys.path.
