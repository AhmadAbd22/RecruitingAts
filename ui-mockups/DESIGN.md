# Recruiting ATS — UI Design System (mockup)

## Product
Internal recruiting ATS for TA / hiring managers. Primary job: move candidates through a requisition-scoped pipeline with clear disposition rules.

## Direction
**Hiring control room** — dense, operational, scannable. Calm ink surfaces; one decisive accent. Not marketing-SaaS purple, not editorial cream/serif.

## Color
| Token | Value | Role |
|-------|-------|------|
| `--ink` | `#0E1A2B` | Primary text, nav |
| `--ink-soft` | `#243447` | Secondary panels |
| `--paper` | `#EEF2F6` | App canvas |
| `--surface` | `#FFFFFF` | Cards, drawers |
| `--line` | `#D5DEE8` | Borders / rules |
| `--muted` | `#5B6B7C` | Meta labels |
| `--accent` | `#0F8B7A` | Primary actions |
| `--accent-ink` | `#065F54` | Accent hover/text |
| `--warn` | `#B45309` | Disposition / caution |
| `--danger` | `#B42318` | Terminal negative stages |
| `--stage-applied` | `#64748B` | Stage rail |
| `--stage-screening` | `#0F8B7A` | Stage rail |
| `--stage-interview` | `#2563EB` | Stage rail |
| `--stage-offer` | `#7C3AED` | Stage rail (sparingly) |
| `--stage-hired` | `#15803D` | Stage rail |
| `--stage-dq` | `#B42318` | Disqualified / NFA |

## Typography
- **Brand / titles:** [Syne](https://fonts.google.com/specimen/Syne) — semi-condensed, confident wordmark
- **UI body:** [Figtree](https://fonts.google.com/specimen/Figtree) — readable at dense sizes
- **IDs / mono:** [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) — application IDs, timestamps

Scale: 12 / 14 / 16 / 20 / 28 / 36. Prefer 14–16 for board density.

## Layout
- Fixed left rail (220px) + top context bar
- Pipeline = horizontal stage columns (min 240px), cards stack vertically
- Detail as right drawer (380px), not a modal for stage moves
- Disposition reason required inline before confirming Disqualified / NFA

## Components
- **App card:** flat surface, 1px `--line`, 8px radius, left stage color bar — no drop-shadow stacks
- **Primary button:** filled `--accent`, 8px radius
- **Ghost button:** border `--line`
- **Field:** 40px height, clear focus ring (`--accent` @ 40%)

## Motion
1. Column enter: cards fade/slide up 120ms staggered
2. Drawer: translateX + fade 180ms
3. Stage confirm: brief accent flash on target column

## API contracts this UI expects
See sample payloads embedded in `pipeline-board.html` (`window.__API__`).
Keyed to:
- `GET /api/applications/pipeline` → `ApplicationPipelineItemDto[]`
- `POST /api/applications` → create
- `PATCH /api/applications/{id}/stage` → stage + optional `dispositionReason`
