# Recruiting ATS — Frontend

Vite + React 19 + React Router. Mockup reference: [`../ui-mockups/demo`](../ui-mockups/demo). API gaps: [`../ui-mockups/API_GAPS.md`](../ui-mockups/API_GAPS.md).

## Run

```powershell
cd frontend
npm install
npm run dev
```

App: http://localhost:5173  
API proxy: `/api` → `http://localhost:5277` (see `vite.config.ts`).

## Kickstart layout

| Area | Path | Owner |
|------|------|--------|
| Auth + nav shell | `src/auth`, `src/layout`, `src/routes.tsx` | Tayyab |
| Shared plug-ins | `src/components/shared` | Everyone (ask before big changes) |
| Requisitions | `src/components/requisitions`, `src/pages/requisitions` | Amina |
| Candidates / pool | `src/components/candidates`, `src/pages/pool` | Ibtesam |
| Pipeline | `src/components/pipeline`, `src/pages/pipeline` | Abdul-Manan |
| Interviews | `src/components/interviews`, `src/pages/interviews` | Tayyab / Abdul-Manan |
| Stages | `src/components/stages`, `src/pages/stages` | Amina |
| Comp audit | `src/pages/audit` | Tayyab |

**Workflow:** compose your page from plug-in components (typed props + barrels). Prefer appending to `routes.tsx` / shared barrels rather than reformatting whole files (merge-conflict hygiene).

## Auth / nav

- `AuthProvider` loads `GET /api/auth/me`, exposes `login` / `register` / `logout`.
- `RequireAuth` redirects to `/login`.
- `AppShell` shows nav links only when the signed-in user has the matching permission.
