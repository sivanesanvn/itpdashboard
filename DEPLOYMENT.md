# NDT Portal — Deployment Guide
## From code to live URL in ~30 minutes

---

## STEP 1 — Create your Supabase project (5 min)

1. Go to https://supabase.com and create a free account
2. Click "New project"
   - Name: `ndt-portal`
   - Region: **Southeast Asia (Singapore)** ← important for data residency
   - Password: save this somewhere safe
3. Wait ~2 minutes for the project to spin up
4. Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → click Run

---

## STEP 2 — Get your API keys (2 min)

1. In Supabase: Settings → API
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (keep private!)
3. Create a file `.env.local` in the project root:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## STEP 3 — Set up storage bucket for PDF reports (2 min)

1. Supabase → Storage → New bucket
   - Name: `reports`
   - Public: OFF (private)
2. Go to Storage → Policies → Add policy for `reports` bucket:
   - Allow authenticated users to upload and download

---

## STEP 4 — Create your first users (5 min)

### Method A — Supabase Dashboard (easiest)
1. Authentication → Users → Invite user
2. Enter email and send invite
3. After they accept, go to Table Editor → profiles
4. Update their row: set `role`, `full_name`, `company`

### Roles to create:
| Role       | Who                          |
|------------|------------------------------|
| manager    | You (NDT Manager)            |
| client     | SembCorp Marine, Jurong Aromatics, etc. |
| tech       | Your NDT technicians         |
| scaffold   | Scaffold contractor company  |
| insulation | Insulation contractor company|
| painting   | Painting contractor company  |

### Method B — From the Team page (after deploying)
Log in as manager → Team tab → Invite user (fills the form, but note: creating users via API requires service_role key on a backend)

---

## STEP 5 — Deploy to Vercel (5 min)

1. Push your code to a GitHub repository
2. Go to https://vercel.com → New project → Import your repo
3. Add environment variables (same as .env.local above)
4. Click Deploy

Your portal will be live at: `https://ndt-portal-xxxx.vercel.app`

Custom domain (optional): Vercel → Settings → Domains → add `portal.yourcompany.com.sg`

---

## STEP 6 — Set up nightly office backup (15 min, one-time)

### Option A — Synology NAS (recommended)
1. Install `Synology Task Scheduler`
2. Create a new scheduled task (runs at 2 AM daily)
3. Script:

```bash
#!/bin/bash
DATE=$(date +%Y-%m-%d)
BACKUP_DIR="/volume1/ndt-backup/$DATE"
mkdir -p "$BACKUP_DIR"

# Download Supabase DB dump (requires supabase CLI)
supabase db dump --project-ref YOUR_PROJECT_REF > "$BACKUP_DIR/db.sql"

# Keep only last 30 days
find /volume1/ndt-backup -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +

echo "Backup complete: $DATE"
```

### Option B — Windows PC in office
1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. Create a scheduled task (Task Scheduler) running the script above
3. Point BACKUP_DIR to an external hard drive path

---

## HOW USERS LOG IN

Share this URL with your clients and contractors:
`https://ndt-portal-xxxx.vercel.app`

Each user gets their own email + password created by you in Supabase.
The portal automatically shows the right view based on their role:

- **Manager** → Dashboard, All Requests, Schedule, Team
- **Client** → My Requests, New Request (2-step form)
- **NDT Tech** → My Assigned Jobs, status updates
- **Scaffold Contractor** → Scaffold jobs only, status updates
- **Insulation Contractor** → Insulation jobs only
- **Painting Contractor** → Painting jobs only

---

## WORKFLOW SUMMARY (from your sketch)

```
Client creates NDT request
  ↓ (flags scaffold/insulation/painting if needed)
Manager reviews → Accepts & schedules
  ↓ assigns NDT tech + contractors
NDT Tech → On-going → Site work completed
Scaffold → Erection → Ready to use → Dismantling → Completed
Insulation → In progress → Ready to use → Completed
Painting → In progress → Completed
  ↓
NDT Tech → Report submitted
  ↓
Client → Reviews & Accepts report (Report accepted)

All statuses visible to Client + NDT Manager at all times
```

---

## ESTIMATED COSTS

| Service     | Cost              | Notes                          |
|-------------|-------------------|--------------------------------|
| Supabase    | Free → S$29/mo    | Free handles ~500 users easily |
| Vercel      | Free → S$25/mo    | Free tier is fine to start     |
| Domain      | ~S$20/year        | .com.sg at Vodien / GoDaddy    |
| Synology NAS | S$300–500 once   | For local office backup        |
| **Total**   | **~S$0–60/mo**    | After initial NAS purchase     |

---

## SUPPORT & NEXT STEPS

Features you can add later:
- [ ] WhatsApp/email notifications when status changes
- [ ] PDF report upload by technician (linked to each job)
- [ ] Client report download / acceptance button
- [ ] Mobile-optimised PWA (works offline for techs on site)
- [ ] Monthly PDF summary report for your clients
