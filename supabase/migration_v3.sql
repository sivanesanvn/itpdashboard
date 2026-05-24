-- Migration v3
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to re-run (all use ADD COLUMN IF NOT EXISTS)

-- ── profiles: persist requester details per user ──────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position   text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;

-- ── requests: columns added after initial schema ──────────────────────────
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS equipment_no          text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS requested_by_id       uuid references public.profiles(id);
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS requested_by_name     text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS requester_position    text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS requester_department  text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS job_category          text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS high_temp             boolean default false;
