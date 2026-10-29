# UI demo — missing / incomplete API contracts

The full UI demo in `ui-mockups/demo/` is **ahead of the backend** in places.
Yellow **API gap** banners in the UI mark those spots. This file is the checklist.

## Implemented in API (UI can wire when integrating)

| UI flow | Contract |
|---------|----------|
| Login / register / me | `POST /api/auth/login`, `register`, `GET /api/auth/me` |
| Requisitions CRUD + workflow | `GET/POST /api/requisitions`, submit / approve / reject / publish / status / budget / team |
| Talent pool search | `GET /api/candidates?q=` |
| Candidate create + duplicates | `POST /api/candidates`, `GET /api/candidates/duplicates` |
| Résumé upload / download | `POST/GET /api/candidates/{id}/resume` |
| Applications create / stage / pipeline | `POST /api/applications`, `PATCH …/stage`, `GET …/pipeline` |
| Employees list | `GET /api/employees` |

## Missing or not stable (flagged in demo)

| UI flow | Expected contract (not shipped) | Notes |
|---------|----------------------------------|-------|
| Interview schedule | `POST /api/interviews` | Panel, type, mode, datetime; calendar log |
| My interviews list | `GET /api/interviews/mine` (or scoped list) | Panel members only |
| Feedback submit | `POST /api/interviews/{id}/feedback` | Rating, strengths, concerns, recommendation; one per interviewer |
| Feedback independence | (same + read rules) | Peers hidden until own submit |
| Interview Completed / No-show | `PATCH /api/interviews/{id}/status` | FR-INT-009 |
| Pipeline stage catalog admin | `GET/POST/PUT/DELETE /api/pipeline-stages` | Reserved stages immutable (FR-ATS-003) |
| Advisory match score | field on pipeline/application DTO | FR-APP-004 — UI shows % labelled Advisory |
| Compensation audit list UI | `GET /api/audit?action=COMPENSATION.VIEW` (or similar) | Backend may log; list endpoint unclear |

## Demo-only shortcuts (not product requirements)

- Persona switcher bypasses real auth cookies/JWT.
- Résumé “download” toasts a mock filename (no blob).
- Match score is random/static seed data, not computed skill overlap.
