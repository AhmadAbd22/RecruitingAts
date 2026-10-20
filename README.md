# Recruiting ATS

Internship Applicant Tracking System — **ASP.NET Core Web API** + **React (Vite)** + **SQL Server**.

## Structure (Option 1)

```text
RecruitingAts/
├── backend/     # RecruitingAts.Api (.NET 9 Web API, Identity, EF Core)
├── frontend/    # React + TypeScript + Vite + axios
└── README.md
```

## Stack decisions

| Area | Choice |
|------|--------|
| UI | React SPA (UI kit TBD — shadcn preferred later) |
| Auth | ASP.NET Core Identity + **httpOnly cookie** |
| HTTP | **axios** with `withCredentials: true` |
| Dev proxy | Vite `/api` → `http://localhost:5277` |
| Database | SQL Server Express + EF Core migrations |

## Prerequisites

- .NET 9 SDK
- Node.js 20+
- SQL Server Express (this machine uses `SQLEXPRESS03`)

## Database

Default connection (`backend/appsettings.json`) for this machine:

```text
Server=localhost\SQLEXPRESS03;Database=RecruitingAts;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```

Other common instances: `localhost\SQLEXPRESS` or `(localdb)\mssqllocaldb` — change the connection string to match your install.

Apply migrations:

```powershell
cd backend
dotnet ef database update
```

## Run (two terminals)

```powershell
# Terminal 1 — API (http://localhost:5277)
cd backend
dotnet run --launch-profile http

# Terminal 2 — React (http://localhost:5173)
cd frontend
npm run dev
```

Open **http://localhost:5173**. Register a user, then confirm `/api/auth/me` works via the cookie session.

## Useful API routes

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/health` | Liveness |
| POST | `/api/auth/register` | Creates user + signs in |
| POST | `/api/auth/login` | Cookie session |
| POST | `/api/auth/logout` | Ends session |
| GET | `/api/auth/me` | Current user (401 if anonymous) |

## Next (domain work)

Must / Should features from the project brief: requisitions, talent pool, applications/pipeline, interviews, audit, compensation rules. Access-control approach TBD with mentor (roles deferred).
