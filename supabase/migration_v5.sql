-- ============================================================
-- Migration v5: Switch request_no to a PostgreSQL sequence
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create a sequence seeded at the current max numeric value
--    so existing request numbers are preserved.
do $$
declare
  current_max int;
begin
  select coalesce(
    max(cast(substring(request_no from 4) as int)), 0
  )
  into current_max
  from public.requests
  where request_no ~ '^\d{2}-\d+$';

  execute format(
    'create sequence if not exists public.request_no_seq start %s',
    current_max + 1
  );
end;
$$;

-- 2. Replace trigger function to use the sequence
create or replace function public.set_request_no()
returns trigger language plpgsql as $$
declare
  yy       text;
  next_num int;
begin
  yy       := to_char(now(), 'YY');
  next_num := nextval('public.request_no_seq');
  new.request_no := yy || '-' || lpad(next_num::text, 5, '0');
  return new;
end;
$$;
