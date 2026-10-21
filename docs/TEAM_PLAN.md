# Recruiting ATS — 5-Day Team Plan (v2)

Aligned with our real stack: **ASP.NET Core Web API + React**, Option B permissions, Must + Should first.  
GitHub repo: https://github.com/AhmadAbd22/RecruitingAts  
Board: use **GitHub Projects** (Todo → In progress → Review → Done). One Issue per task; title with `FR-…` when applicable.

**Do not** re-initialize the solution or plan Razor MVC views. Foundation (repo, Identity, cookies, seed users, file interface stub, README) is already started.

---

## Team roster

| Person | Primary track |
|--------|----------------|
| **Ahmad** | Shared backend foundation, scope/compensation/audit wiring, applications services, interview services |
| **Amina** | Requisitions lifecycle (API + React) |
| **Ibtesam** | Candidates, talent pool, PDF upload, duplicates |
| **Abdul-Manan** | Requisition team, pipeline board, schedule interview |
| **Talha** | App shell / nav, audit helpers, My Interviews + feedback independence, xUnit |

Everyone reviews PRs into `master` (protected; no direct pushes).

---

## Locked product rules (already decided)

- Approver = **Admin** (`REQUISITIONS.APPROVE`)
- Auth = Identity + httpOnly cookie; permissions via policies
- Match score / stats / tags / merge / offers = **stretch only** (after Must works)
- Open domain details stay in local `DOMAIN_DECISIONS.local.md` (not committed)

---

## Day 1 — Setup, architecture, foundation

**Objective:** Agree ERD, finish shared models/migrations, GitHub Project board, React shell.

### All
- Kick-off; agree **ERD** (Employee, Requisition, TeamMember, Candidate, Application, PipelineStage, Interview*, AuditLog)
- Create GitHub Project + Issues for Must FRs (split API / UI where useful)
- Confirm SQL connection string pattern in README for each machine

### Ahmad
- Wire EF entities into `AppDbContext`; keep migrations clean
- Seed **Employee** rows linked to demo Identity users
- Confirm seeder still runs on startup; document any new seed in README

### Amina
- Entity + migration: **Requisition**, **RequisitionTeamMember**
- Status enum/constants: Draft, PendingApproval, Published, OnHold, Filled, Closed, Cancelled (adjust only if mentor overrides)

### Ibtesam
- Harden **IFileStorage** (PDF only, size limit, safe paths)
- Entity + migration: **Candidate** (name, email, phone, resume path, source, consent date)

### Abdul-Manan
- Entity + migration: **Application** (candidate ↔ requisition, stage, source, disposition reason, expected salary confidential)
- Entity + seed: **PipelineStage** catalog  
  - Reserved: Applied, Hired, Disqualified, NFA  
  - Working (default): Screening, Interview, Offer  

### Talha
- Entity + **IAuditService** / helper for AuditLog writes
- React: app shell, auth context from `/api/auth/me`, nav placeholders by permission
- Add empty `backend` test project skeleton (`RecruitingAts.Tests`) if not present

**Day 1 done when:** ERD agreed, migrations apply on a clean DB, demo users login, board has Day 2–4 Issues.

---

## Day 2 — Requisitions & talent pool

**Objective:** Requisition lifecycle + candidate ingestion with duplicate warnings.

### Ahmad
- **Requisition scope** service (Admin/`REQUISITIONS.ALL_REQS.VIEW` → all; else team membership only)
- **Compensation** guard: omit budget/expected salary without permission; **audit every view**
- Sensitive-data rule: no PII in logs

### Amina
- Requisition APIs: create Draft, edit rules (keep simple), submit approval, Admin approve/reject→Draft+comment, publish, hold/close/cancel/fill + reason where required
- React: requisition list/detail/create + approval queue for Admin

### Ibtesam
- Candidate APIs: create, get, search (talent pool) with `POOL.VIEW`
- PDF upload endpoint via `IFileStorage`
- Duplicate detection (email + phone) → warn before save
- React: talent pool search + create candidate form

### Abdul-Manan
- Requisition **team** APIs: add/remove members; roles Owner / Recruiter / TechnicalInterviewer / FinalInterviewer; exactly one Owner; audit team changes
- React: team management on requisition detail

### Talha
- xUnit: requisition status transitions; duplicate warning service tests
- Wire audit calls into requisition status + team changes (with Amina/Abdul-Manan)
- Polish shared API error shape for validation messages

**Day 2 done when:** Admin can approve & publish; recruiter can create candidate + PDF; team can be assigned; scope hides foreign requisitions.

---

## Day 3 — Applications, pipeline board, stages

**Objective:** Link pool candidates to published jobs; visual pipeline; human stage moves.

### Ahmad
- APIs: add talent-pool candidate → **published** requisition → Application @ Applied
- Optional **only if ahead**: advisory skill-overlap score (label advisory; never auto reject/hire). Otherwise skip.

### Amina
- Admin APIs/UI: manage **working** pipeline stages (not reserved names)
- Help with requisition filters if needed

### Ibtesam
- Source attribution on candidate + application (referral / careers / agency / etc.)
- Consent date on create/edit (Should)
- Candidate detail API: profile + résumé download + applications **within caller scope**

### Abdul-Manan
- Pipeline board UI: applications grouped by stage for one requisition (scoped)
- Stage move actions (user-initiated only)
- Disposition Disqualified / NFA **requires reason**

### Talha
- xUnit: stage-move rules; disposition reason required
- Candidate detail React page (with Ibtesam’s API)
- Help Abdul-Manan if board slips

**Day 3 done when:** Happy path from pool → Applied → Screening/Interview on the board with disposition working.

---

## Day 4 — Interviews, panel feedback, integration

**Objective:** Schedule interviews, panel, structured feedback, independence rule.

### Ahmad
- Interview APIs: create/schedule, status Completed / NoShow
- Simulated calendar/email **log only** (no real send)
- Panel members from requisition interviewer team; at most one lead

### Amina
- Prefer helping interview UI / bugfix on requisitions  
- Stretch **only if Must solid**: requisition clone or simple stats page

### Ibtesam
- Finish candidate detail UI: background, résumé download, application history (scoped)
- Smoke-test upload + duplicate flows end-to-end

### Abdul-Manan
- React: Schedule Interview (date/time/type/mode) + panel picker
- Integrate with pipeline (schedule from application)

### Talha
- React: **My Interviews** + feedback form (rating, strengths, concerns, recommendation)
- **Feedback independence** in API + UI (cannot see peers’ feedback until own submit; one active submission per interviewer)
- xUnit for independence rule

**Day 4 done when:** Interviewer can open My Interviews, submit feedback, and only then see others’.

---

## Day 5 — Testing, bugs, docs, demo

**Objective:** Stable demo; README accurate; Must rules proven.

### Ahmad
- Migration audit; seed reset script/notes; storage folder checks
- Final pass on scope + compensation audit trails

### Amina
- UI cleanup on requisition/approval screens; consistent empty/error states

### Ibtesam
- User-flow testing: candidate create, PDF, duplicates, pool search

### Abdul-Manan
- E2E: publish → add applicant → stage moves → schedule interview

### Talha
- Finalize xUnit suite; document how to run tests in README  
  `dotnet test` from repo / solution

### All
- Fix P0 bugs; rehearse **20-minute demo** twice  
- Demo script (suggested order):
  1. Login Admin vs Recruiter vs Interviewer (permissions differ)
  2. Create requisition → Admin approve → publish → set team
  3. Create candidate + PDF → duplicate warn demo
  4. Add to requisition → pipeline moves → disposition reason
  5. Schedule interview → interviewer feedback independence
  6. Show compensation visible only for Admin + audit row

---

## GitHub Projects — Issue naming

Examples:

- `[Ahmad][FR-ATS-001] Scope filter for requisitions`
- `[Amina][FR-REQ-002] API approve/reject requisition`
- `[Ibtesam][FR-CAND-003] Duplicate warn email/phone`
- `[Abdul-Manan][FR-APP-009] Pipeline board UI`
- `[Talha][FR-INT-007] Feedback independence`

Labels: `day-1`…`day-5`, `api`, `ui`, `rules`, `tests`, `must`, `should`, `stretch`.

Milestones: `Day 1` … `Day 5`.

---

## Explicitly out of the critical path

| Item | When |
|------|------|
| Match score | Stretch if Day 3 ahead |
| Tags / clone / stats / merge / offers | Stretch Day 4–5 only |
| Real email/calendar/AI parsing | Out of scope |
| Role-admin UI | Out of scope (Option B seed only) |
| Rebuilding MVC / new solution layout | Do not do |

---

## Daily standup (10 min)

Each person: yesterday / today / blocker.  
If blocked >2 hours on a dependency → pair or reassign on the board.

---

## Success bar

Must hiring path works under scope + permissions; compensation gated; feedback independence holds; PDF + duplicates work; tests cover the main rules; demo runs without apology.
