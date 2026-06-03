-- ============================================================
-- NDT Portal — Migration v3: 12-Stage Workflow
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run on existing data — renames statuses, no data loss
-- ============================================================

-- Step 1: Drop old CHECK constraints
ALTER TABLE public.requests    DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE public.support_jobs DROP CONSTRAINT IF EXISTS support_jobs_status_check;

-- Step 2: Migrate existing request status values (old DB values → new)
UPDATE public.requests SET status = 'NDT scheduled'          WHERE status = 'Scheduled';
UPDATE public.requests SET status = 'NDT in progress'        WHERE status = 'On-going';
UPDATE public.requests SET status = 'Ready for NDT'          WHERE status = 'Site work completed';
UPDATE public.requests SET status = 'Draft report submitted'  WHERE status = 'Report submitted';
UPDATE public.requests SET status = 'Closed'                 WHERE status = 'Report accepted';

-- Step 3: Migrate status_history audit trail
UPDATE public.status_history SET old_status = 'NDT scheduled'          WHERE old_status = 'Scheduled';
UPDATE public.status_history SET old_status = 'NDT in progress'        WHERE old_status = 'On-going';
UPDATE public.status_history SET old_status = 'Ready for NDT'          WHERE old_status = 'Site work completed';
UPDATE public.status_history SET old_status = 'Draft report submitted'  WHERE old_status = 'Report submitted';
UPDATE public.status_history SET old_status = 'Closed'                 WHERE old_status = 'Report accepted';

UPDATE public.status_history SET new_status = 'NDT scheduled'          WHERE new_status = 'Scheduled';
UPDATE public.status_history SET new_status = 'NDT in progress'        WHERE new_status = 'On-going';
UPDATE public.status_history SET new_status = 'Ready for NDT'          WHERE new_status = 'Site work completed';
UPDATE public.status_history SET new_status = 'Draft report submitted'  WHERE new_status = 'Report submitted';
UPDATE public.status_history SET new_status = 'Closed'                 WHERE new_status = 'Report accepted';

-- Step 4: Add updated CHECK constraints for new 12-stage workflow
ALTER TABLE public.requests ADD CONSTRAINT requests_status_check
  CHECK (status IN (
    'New request',
    'Scaffold erection in progress',
    'Insulation removal in progress',
    'Ready for NDT',
    'NDT scheduled',
    'NDT in progress',
    'Draft report submitted',
    'Draft report accepted',
    'Final report submitted',
    'Reinstatement in progress',
    'Closed',
    'Cancelled'
  ));

-- Support jobs: add 'In progress' (used by Insulation Removal and Painting workflows)
ALTER TABLE public.support_jobs ADD CONSTRAINT support_jobs_status_check
  CHECK (status IN (
    'Pending',
    'Erection',
    'Ready to use',
    'Dismantling',
    'In progress',
    'Completed'
  ));
