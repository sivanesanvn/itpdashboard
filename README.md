# NDT Portal — Setup Guide

Full-stack NDT request management portal for Singapore operations.

**Roles:** Manager · Client · Technician · Scaffold Contractor

---

## Quick start (15 minutes)

### 1. Create Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click **New project** → name it `ndt-portal` → choose region **Southeast Asia (Singapore)**
3. Wait ~2 min for project to spin up

### 2. Run the database schema

1. In Supabase dashboard → **SQL editor**
2. Open `supabase/schema.sql` from this folder
3. Paste the entire contents → click **Run**
4. You should see "Success. No rows returned."

### 3. Create a Storage bucket for reports

1. In Supabase → **Storage** → **New bucket**
2. Name: `reports`
3. Make it **Public** (so clients can view their reports via URL)

### 4. Get your API keys

1. In Supabase → **Settings** → **API**
2. Copy:
   - **Project URL** (e.g. `https://abcdef.supabase.co`)
   - **anon / public key**
   - **service_role key** (keep this secret)

### 5. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 6. Create user accounts

In Supabase → **Authentication** → **Users** → **Add user** for each person:

| Email | Password | Role (metadata) |
|-------|----------|-----------------|
| azri@ndtsg.com | (set one) | manager |
| lbs@sembcorp.com | (set one) | client |
| farid@ndtsg.com | (set one) | tech |
| rajan@fastscaff.com | (set one) | scaffold |

After creating each user, note their **User UID**. Then in SQL editor, run the seed INSERT in `schema.sql` with the real UIDs filled in.

### 7. Install and run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## Deploy to Vercel (free)

```bash
npm install -g vercel
vercel
```

Follow prompts → add environment variables when asked. Done — you'll get a live URL.

---

## Workflow summary

```
Client creates request (Step 1 basic → Step 2 technical optional)
        ↓
Manager reviews → Schedules + assigns technician
        ↓
  [If scaffold needed]
  Client enables scaffold request → Manager assigns scaffold contractor
  Scaffold contractor: Pending → Erection → Ready to use → Dismantle → Completed
        ↓
Technician: Scheduled → On-going → Site work completed → submits PDF report
        ↓
Client reviews report → Accepts → Status: Report accepted
```

All status changes are visible to both client and NDT company in real time.

---

## Folder structure

```
ndt-portal/
├── supabase/
│   └── schema.sql          ← Run this first in Supabase
├── pages/
│   ├── index.js            ← Login page
│   ├── manager/
│   │   ├── index.js        ← Dashboard
│   │   ├── requests.js     ← All requests + detail panel
│   │   ├── schedule.js     ← Schedule calendar view
│   │   └── technicians.js  ← Team roster
│   ├── client/
│   │   ├── index.js        ← New request (2-step form)
│   │   └── requests.js     ← My requests + progress tracker
│   ├── tech/
│   │   └── index.js        ← Technician job view + report upload
│   └── scaffold/
│       └── index.js        ← Scaffold contractor job view
├── components/
│   ├── Layout.js           ← Sidebar + navigation
│   └── StatusBadge.js      ← Badges + ProgressTracker
├── lib/
│   └── supabase.js         ← Client + shared constants
├── styles/
│   └── globals.css         ← Tailwind base styles
├── .env.example            ← Copy to .env.local
└── package.json
```

---

## Adding new users

**Clients:** Create in Supabase Auth → add profile row with `role = 'client'` and `company = 'Company Name'`

**Technicians:** Same, `role = 'tech'`, add `cert` field with ASNT certification

**Scaffold contractors:** Same, `role = 'scaffold'`, add `company` field

---

## Nightly backup (office NAS)

Install `pg_dump` on your NAS or a PC that stays on. Add this to Task Scheduler / cron:

```bash
# Run every night at 2 AM
PGPASSWORD=your-db-password pg_dump \
  "postgresql://postgres:password@db.your-project.supabase.co:5432/postgres" \
  > /backups/ndt-portal-$(date +%Y%m%d).sql
```

Get the DB password from Supabase → Settings → Database → Connection string.
Keep 30 days of backups. Test a restore monthly.
