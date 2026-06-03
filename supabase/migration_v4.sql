-- ============================================================
-- Migration v4: Clear all request data + new YY-NNNNN numbering
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Clear all request-related data (cascade order)
truncate table public.status_history  restart identity cascade;
truncate table public.request_documents restart identity cascade;
truncate table public.support_jobs    restart identity cascade;
truncate table public.requests        restart identity cascade;

-- 2. Drop old trigger + function
drop trigger if exists set_request_no_trigger on public.requests;
drop function if exists public.set_request_no();

-- 3. New function: YY-NNNNN with global running sequence
--    Year prefix reflects current year, number never resets.
--    e.g. 26-00001 ... 26-00998, then 27-00999, 27-01000 ...
create or replace function public.set_request_no()
returns trigger language plpgsql as $$
declare
  yy       text;
  next_num int;
begin
  yy := to_char(now(), 'YY');

  -- Extract numeric part from ALL requests regardless of year prefix
  select coalesce(
    max(cast(substring(request_no from 4) as int)), 0
  ) + 1
  into next_num
  from public.requests
  where request_no ~ '^\d{2}-\d+$';

  new.request_no := yy || '-' || lpad(next_num::text, 5, '0');
  return new;
end;
$$;

create trigger set_request_no_trigger
  before insert on public.requests
  for each row execute procedure public.set_request_no();
