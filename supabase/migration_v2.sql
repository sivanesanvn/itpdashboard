-- Migration v2
-- Run in: Supabase Dashboard → SQL Editor → Run

-- Add position and department to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;

-- Add requester position/department to requests for historical record
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS requester_position text;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS requester_department text;

-- Create request_comments table
CREATE TABLE IF NOT EXISTS public.request_comments (
  id          uuid default uuid_generate_v4() primary key,
  request_id  uuid references public.requests(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) not null,
  user_name   text not null,
  user_role   text not null,
  body        text not null,
  created_at  timestamptz default now()
);
ALTER TABLE public.request_comments ENABLE ROW LEVEL SECURITY;

-- RLS: anyone who can see the request can read/write comments
CREATE POLICY "comments access" ON public.request_comments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.requests r WHERE r.id = request_id
    AND (
      r.client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('manager','coordinator','tech','scaffold','insulation','painting')
      )
      OR EXISTS (
        SELECT 1 FROM public.support_jobs sj
        WHERE sj.request_id = r.id AND sj.contractor_id = auth.uid()
      )
    )
  )
);
