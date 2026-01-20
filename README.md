# TaskScheduler (React + Vite)

This repository contains the frontend for the "TaskScheduler" semestral project, built with React and Vite.

Important: this frontend expects a backend API that exposes endpoints used in the code (see "Backend / API" below). The frontend uses a small API wrapper located at `src/lib/api.js` which defaults to the base path `/api` and sends credentials (cookies) with requests. You can override the backend base URL with the `VITE_API_BASE` environment variable.

## Quick start (frontend)

Make sure you have Node.js (18+) and npm installed.

1. Install dependencies

```bash
npm install
```

2. Start dev server

```bash
npm run dev
```

3. Open http://localhost:5173 (or the address shown by Vite) in your browser.

Notes:
- The frontend expects the backend API to provide endpoints used by the app (examples: `/?c=users&a=list`, `/?c=task&a=index`, `/?c=category&a=index`, `/?c=login&a=login`, etc.). During development you can either run the backend on the same origin under `/api` (recommended) or set `VITE_API_BASE` in an `.env` file to point to your backend URL (for example: `VITE_API_BASE=http://localhost:8080/api`).
- The project uses Tailwind CSS utilities plus a small custom `index.css` file for project-specific rules.

## What the frontend contains (high level)

- src/main.jsx — application entry, router and auth/options providers
- src/lib/api.js — lightweight API wrapper used throughout the app
- src/contexts/AuthContext.jsx — authentication/session detection and provider
- src/contexts/OptionsContext.jsx — app options provider and translations
- src/pages/* — pages (Dashboard, Calendar, Users, CategoryManager, Login, Register, Options)
- src/components/* — reusable UI components (TaskCard, Sidebar, calendar views, etc.)
- index.css — small set of custom CSS rules (dark mode, calendar responsiveness)

## Backend / API (required)

This frontend calls a backend API which is expected to expose endpoints compatible with the calls in `src/lib/api.js` and the pages. Examples of used endpoints:

- `GET /?c=users&a=list` — list users (protected)
- `POST /?c=users&a=create` — create user
- `POST /?c=users&a=update&id=...` — update user
- `POST /?c=users&a=delete&id=...` — delete user
- `GET /?c=task&a=index` — list tasks
- `POST /?c=task&a=create` — create task
- `POST /?c=task&a=update` — update task
- `POST /?c=task&a=delete` — delete task
- `GET /?c=category&a=index` — list categories
- `POST /?c=category&a=create` — create category
- `POST /?c=category&a=update&id=...` — update category
- `POST /?c=category&a=delete&id=...` — delete category
- `GET /?c=options&a=index` and `POST /?c=options&a=update` — application options
- `POST /?c=login&a=login` — login
- `POST /?c=register&a=register` — register

If you don't yet have a backend, you can either implement these endpoints or adapt the frontend to a different API shape by editing `src/lib/api.js` and callers.

## Semestral project mandatory requirements — checklist and evidence

Below each mandatory requirement is a short status and where to find evidence in the repository.

1) Aplikačná logika oddelená od prezentačnej vrstvy (application logic separated from presentation)
- Status: Done
- Evidence: `src/contexts/*` hold logic (AuthContext, OptionsContext), `src/lib/api.js` centralizes API access, pages/components focus mostly on UI and call the API/context. Files: `src/lib/api.js`, `src/contexts/AuthContext.jsx`, `src/contexts/OptionsContext.jsx`.

2) Min. 5 dynamických stránok
- Status: Done (7 pages)
- Evidence: `src/pages/` contains: `Dashboard.jsx`, `Calendar.jsx`, `Users.jsx`, `CategoryManager.jsx`, `Login.jsx`, `Register.jsx`, `Options.jsx` (7 dynamic pages).

3) Min. 50 vlastných riadkov kódu v JavaScripte (Typescript, ...)
- Status: Done
- Evidence: The repository contains many JSX/JS files under `src/` with far more than 50 lines of custom logic (examples: `src/pages/Dashboard.jsx`, `src/pages/Users.jsx`, `src/pages/CategoryManager.jsx`).

4) Min. 20 vlastných CSS pravidiel (mimo Bootstrap a pod.)
- Status: Likely Done
- Evidence: `index.css` contains multiple project-specific rules (dark mode overrides, calendar responsiveness, selectors for `.calendar-root` etc.). If you need an explicit count for assessment, we can compute exact rule counts and, if <20, add more small rules.

5) Min. 3 zmysluplné DB entity, všetky použité v aplikácii (tabuľka používateľov sa do týchto entít nezapočítava)
- Status: Done
- Evidence: Entities used by the frontend: `task` (tasks), `category` (categories), `options` (application options). Each is used in the UI: Tasks are displayed/managed on Dashboard/Calendar; Categories are managed in CategoryManager; Options are loaded/saved in OptionsContext and used across app.

IMPORTANT NOTE ABOUT `options` PERSISTENCE
- Confirmation: Based on the screenshot you provided (table `options` with rows and columns like `id`, `user_id`, `language`, `theme`, `task_filter`, `task_sort`, `created_at`, `updated_at`), the backend *does* persist `options` in the database. This means `options` is a first-class, persistent DB entity and can be counted among the required 3 DB entities (together with `task` and `category`).
- Frontend evidence: the frontend uses `src/contexts/OptionsContext.jsx`, which calls `GET /?c=options&a=index` to load options and `POST /?c=options&a=update` to save them — these are standard CRUD-style endpoints and the frontend is already implemented to work with a persisted `options` entity.
- Quick verification (example curl): if your backend base is `http://localhost` (or set `VITE_API_BASE` accordingly), you can verify the endpoint from the machine running the backend with e.g.: 

```bash
# replace host/path if your backend uses a different base URL
curl -s "${VITE_API_BASE:-http://localhost}/?c=options&a=index" | jq '.'
```

(If `jq` is not available, remove the `| jq '.'` part.)

6) Aspoň jeden 1:N alebo M:N vzťah medzi DB entitami
- Status: Done
- Evidence: Tasks reference Category (task.category / category_id), which represents 1 category -> N tasks (1:N). See `src/pages/Dashboard.jsx` and `src/pages/Calendar.jsx` where tasks carry `category` and components resolve category objects.

7) Implementované všetky CRUD operácie nad dvomi entitami
- Status: Done
- Evidence: Tasks: create/read/update/delete implemented in `src/pages/Dashboard.jsx` and `src/pages/Calendar.jsx` (calls to `/?c=task&a=<action>`). Categories: create/read/update/delete implemented in `src/pages/CategoryManager.jsx` (calls to `/?c=category&a=<action>`). Users page also implements full CRUD for users in `src/pages/Users.jsx`.

8) Aplikácia musí obsahovať časť, do ktorej je nutné sa prihlásiť
- Status: Done
- Evidence: `src/pages/Login.jsx`, `src/pages/Register.jsx`, and `src/contexts/AuthContext.jsx` are used in `src/main.jsx` to restrict routes when not authenticated. The app hides protected routes unless authenticated.

9) K aplikácii je nutné priložiť návod na inštaláciu (README)
- Status: Done (this file)
- Evidence: This README now contains install/run instructions for the frontend and notes for the backend.

Notes about items that might require attention before defence
- README: If your assignment requires that the entire project (frontend + backend) be attached, include the backend or describe how to run it. The frontend alone depends on a compatible backend.
- CSS rule count: if the examiners request an exact count of 20+ custom CSS rules, I can add a short CSS file with extra clear rules (non-framework) to ensure the requirement is unambiguously met.
- DB entities: backend must provide `task`, `category`, and `options` (or substitute others). If your backend uses different names, update the frontend API calls accordingly or explain mappings in the defence.

## How to set VITE_API_BASE (optional)

Create a `.env` file in the project root (same folder as `package.json`) with contents like:

```
VITE_API_BASE=http://localhost:8080/api
```

Then run the dev server as above. This helps if your backend runs on a different port or path.

## Where to look for the main logic when preparing the defence

- Authentication/session check: `src/contexts/AuthContext.jsx`
- API wrapper and error handling: `src/lib/api.js`
- Tasks (CRUD + UI): `src/pages/Dashboard.jsx`, `src/pages/Calendar.jsx`, `src/components/TaskCard.jsx`
- Categories (CRUD + UI): `src/pages/CategoryManager.jsx`
- Users (CRUD + UI): `src/pages/Users.jsx`
- Options and translations: `src/contexts/OptionsContext.jsx`, `src/pages/Options.jsx`

If you want, I can:
- compute an exact count of custom CSS rules and JS lines and add a small CSS file to guarantee 20+ rules, or
- prepare a short defence note summarizing how the app meets each requirement with screenshots or sequence diagrams.

If you'd like me to add or adjust anything (for example add explicit CSS rules, or include a sample mock backend for local testing), tell me which you prefer and I will implement it.
