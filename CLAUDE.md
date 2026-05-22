# NDT Portal — CLAUDE.md

Project context for Claude Code sessions. Read this before making any changes.

## What This Is

**NDT Portal** — a multi-role web app for managing Non-Destructive Testing (NDT) inspection requests for Cutech, Singapore. Industrial clients submit inspection jobs; NDT technicians execute them; contractors handle support work (scaffolding, insulation, painting) in parallel.

Production is deployed on **Vercel** (frontend) + **Supabase** (database/auth/storage).

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14.2.3 (Pages Router) |
| UI | React 18 + Tailwind CSS 3 |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Auth | `@supabase/auth-helpers-nextjs` + `@supabase/auth-helpers-react` |
| Date utils | `date-fns` v3 |
| Email | Resend API (via `/pages/api/notify-report.js`) |

---

## Project Structure

```
pages/
  index.js              # Login page (entry point for all users)
  _app.js               # Root — wraps app with Supabase SessionContextProvider
  api/notify-report.js  # Server-side email via Resend
  client/
    requests.js         # Client dashboard — list own requests + track status
    new.js              # 2-step form to create a new request
  manager/
    dashboard.js        # Manager overview
    requests.js         # All requests list + filters
    schedule.js         # Schedule job, assign technician + contractors
    team.js             # Manage team profiles
    technicians.js      # Technician availability view
  tech/
    index.js            # Technician home
    jobs.js             # Assigned jobs + status updates + report upload
  contractor/
    jobs.js             # Scaffold/insulation/painting contractor job view
  coordinator/
    dashboard.js        # Coordinator overview
  scaffold/
    index.js            # Scaffold-specific view

components/
  Layout.js             # Sticky header + nav tabs + footer + password modal
  StatusBadge.js        # StatusBadge, NDTTimeline, SupportJobBadge
  DocumentUpload.js     # Upload/download files to Supabase Storage
  MethodSelect.js       # NDT method dropdown (21 methods)
  PrintRequest.js       # Print-to-PDF

lib/
  supabase.js           # Supabase client + all shared constants

supabase/
  schema.sql            # Full PostgreSQL schema + RLS policies + triggers

styles/
  globals.css           # Tailwind base + reusable component classes
```

---

## Roles & Routing

Defined in `pages/index.js` as `ROLE_ROUTES`:

| Role | Route after login | Description |
|------|------------------|-------------|
| `manager` | `/manager/dashboard` | Full access, scheduling, team |
| `coordinator` | `/coordinator/dashboard` | Operations overview |
| `client` | `/client/requests` | Submit + track own requests |
| `tech` | `/tech/jobs` | Assigned jobs only |
| `scaffold` | `/contractor/jobs` | Scaffold support jobs |
| `insulation` | `/contractor/jobs` | Insulation support jobs |
| `painting` | `/contractor/jobs` | Painting support jobs |

---

## Request Lifecycle (NDT_STATUSES)

```
New request → Scheduled → Site Work On-going → Site work completed
→ Draft Report Submitted → Draft Report Accepted → Report accepted
                                                  → Cancelled (any point)
```

Defined in `lib/supabase.js` as `NDT_STATUSES`.

## Support Job Statuses (SUPPORT_STATUSES)

- **Scaffold**: Pending → Erection → Ready to use → Dismantling → Completed
- **Insulation Removal**: Pending → In progress → Ready to use → Completed
- **Painting**: Pending → In progress → Completed

---

## Database Tables

- **profiles** — user profiles linked to `auth.users` (role, full_name, company, phone, cert, available)
- **requests** — main domain model; step1 + step2 fields, status, tech_id, support flags
- **support_jobs** — scaffold/insulation/painting jobs linked to a request
- **request_documents** — file metadata (report or supporting doc, bucket path)
- **status_history** — auto-logged audit trail via DB triggers on status changes

**Row Level Security** enforces data isolation: clients see only their requests, techs only see assigned jobs, contractors only see requests where they have a support_job.

---

## Shared Constants (lib/supabase.js)

All status lists, color mappings, role labels, NDT methods, and job categories live here. Always update here first when adding new statuses or roles.

- `NDT_STATUSES` — 8 statuses (+ Cancelled)
- `SUPPORT_STATUSES` — per support type
- `STATUS_COLOR` — Tailwind classes per status
- `ROLE_LABEL` / `ROLE_COLOR` — display labels + badge colors per role
- `PRIORITY_COLOR` — Normal / Urgent / Shutdown turnaround
- `NDT_METHODS` — 21 methods (MT, PT, UT, RT-*, PAUT-*, etc.)
- `JOB_CATEGORIES` — Meridium / Turn Around / Ad-Hoc

---

## CSS Conventions (globals.css)

Reusable Tailwind component classes — use these everywhere, don't inline equivalent styles:

| Class | Usage |
|-------|-------|
| `.btn` | Base button |
| `.btn-primary` | Blue CTA button |
| `.btn-success` | Green confirm button |
| `.btn-ghost` | White/outline button |
| `.btn-danger` | Red destructive button |
| `.input` | Text/select input |
| `.label` | Form field label |
| `.card` | White rounded card container |
| `.badge` | Inline status/role pill |
| `.section-title` | Gray uppercase section heading |

Brand color: `#185FA5` (primary blue), `#0C447C` (dark blue).

---

## Layout Component

`components/Layout.js` wraps every authenticated page. Props:
- `profile` — current user profile object (from Supabase `profiles` table)
- `nav` — array of `{ href, icon, label, badge? }` for the tab bar
- `children` — page content

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL         # Public, used in browser
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Public, authenticated user access
SUPABASE_SERVICE_ROLE_KEY        # Secret, server-only (admin ops)
RESEND_API_KEY                   # Email sending (server-only)
```

---

## Git Workflow

- **`main`** = production (auto-deploys to Vercel)
- **`claude/epic-archimedes-UzxSG`** = Claude's working branch
- All Claude changes go to the feature branch first; user merges to main to deploy

---

## Dev Commands

```bash
npm run dev     # Local dev server at http://localhost:3000
npm run build   # Production build
npm start       # Run production build
```

---

## Key Conventions

- No comments unless the WHY is non-obvious
- No new abstractions beyond what the task requires
- Prefer editing existing files over creating new ones
- Use `.card`, `.btn`, `.input`, `.badge` classes — don't re-invent them inline
- Keep all status/color/role constants in `lib/supabase.js`
- Role-specific pages go in their role subfolder under `pages/`
- Always wrap authenticated pages with `<Layout profile={profile} nav={[...]}>`
