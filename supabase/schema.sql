-- ============================================================
-- NDT Portal — Full Schema (5 roles incl. scaffold/insulation/painting)
-- Run in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- Roles: manager | client | tech | scaffold | insulation | painting
-- ============================================================
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  role        text not null check (role in ('manager','client','tech','scaffold','insulation','painting')),
  full_name   text not null,
  company     text,
  phone       text,
  email       text,
  cert        text,
  available   boolean default true,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- REQUESTS
-- ============================================================
create table public.requests (
  id              uuid default uuid_generate_v4() primary key,
  request_no      text unique,
  client_id       uuid references public.profiles(id) not null,
  company         text not null,
  -- Step 1
  location        text not null,
  contact_name    text,
  contact_phone   text,
  contact_email   text,
  ndt_method      text not null,
  scope_qty       text,
  description     text,
  date_needed     date not null,
  priority        text default 'Normal' check (priority in ('Normal','Urgent','Shutdown / turnaround')),
  -- Support work flags
  needs_scaffold    boolean default false,
  needs_insulation  boolean default false,
  needs_painting    boolean default false,
  -- Step 2 technical details
  material          text,
  thickness_mm      text,
  pipe_size         text,
  p_number          text,
  code_standard     text,
  acceptance        text,
  special_notes     text,
  step2_complete    boolean default false,
  -- Status
  status            text default 'New request' check (status in (
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
  )),
  tech_id           uuid references public.profiles(id),
  tech_name         text,
  scheduled_date    date,
  manager_notes     text,
  report_url        text,
  report_filename   text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
alter table public.requests enable row level security;

create or replace function public.set_request_no()
returns trigger language plpgsql as $$
declare
  yy       text;
  next_num int;
begin
  yy := to_char(now(), 'YY');

  -- Global sequence: extract the numeric part from ALL requests regardless of year prefix
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

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger requests_touch_updated_at
  before update on public.requests
  for each row execute procedure public.touch_updated_at();

-- ============================================================
-- SUPPORT JOBS (scaffold / insulation / painting)
-- Each is a separate job linked to a request
-- contractor_role matches the profiles.role of the contractor
-- ============================================================
create table public.support_jobs (
  id               uuid default uuid_generate_v4() primary key,
  request_id       uuid references public.requests(id) on delete cascade not null,
  job_type         text not null check (job_type in ('Scaffold','Insulation Removal','Painting')),
  contractor_id    uuid references public.profiles(id),
  contractor_name  text,
  contractor_role  text check (contractor_role in ('scaffold','insulation','painting')),
  status           text default 'Pending' check (status in (
    'Pending','Erection','Ready to use','Dismantling','In progress','Completed'
  )),
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
alter table public.support_jobs enable row level security;

create trigger support_jobs_touch_updated_at
  before update on public.support_jobs
  for each row execute procedure public.touch_updated_at();

-- ============================================================
-- STATUS HISTORY — full audit trail
-- ============================================================
create table public.status_history (
  id          uuid default uuid_generate_v4() primary key,
  request_id  uuid references public.requests(id) on delete cascade,
  source      text default 'ndt',   -- 'ndt' | 'scaffold' | 'insulation' | 'painting'
  record_id   uuid,
  old_status  text,
  new_status  text not null,
  changed_by  uuid references public.profiles(id),
  changed_at  timestamptz default now()
);
alter table public.status_history enable row level security;

create or replace function public.log_request_status()
returns trigger language plpgsql security definer as $$
begin
  if old.status is distinct from new.status then
    insert into public.status_history (request_id, source, record_id, old_status, new_status, changed_by)
    values (new.id, 'ndt', new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;
create trigger log_request_status_trigger
  after update on public.requests
  for each row execute procedure public.log_request_status();

create or replace function public.log_support_status()
returns trigger language plpgsql security definer as $$
begin
  if old.status is distinct from new.status then
    insert into public.status_history (request_id, source, record_id, old_status, new_status, changed_by)
    values (new.request_id, lower(new.job_type), new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;
create trigger log_support_status_trigger
  after update on public.support_jobs
  for each row execute procedure public.log_support_status();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: returns current user's role without triggering RLS (security definer bypasses policies)
create or replace function public.my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Profiles: own row + manager sees all
create policy "own profile" on public.profiles for select using (auth.uid() = id);
create policy "manager all profiles" on public.profiles for all using (
  public.my_role() = 'manager'
);

-- Requests: clients own; manager/tech see all; scaffold/insulation/painting see requests they have a support job for
create policy "requests access" on public.requests for all using (
  client_id = auth.uid()
  or public.my_role() in ('manager','tech','coordinator')
  or exists (
    select 1 from public.support_jobs sj
    where sj.request_id = id and sj.contractor_id = auth.uid()
  )
);

-- Support jobs: assigned contractor + manager + client of that request
create policy "support_jobs access" on public.support_jobs for all using (
  contractor_id = auth.uid()
  or public.my_role() = 'manager'
  or exists (
    select 1 from public.requests r where r.id = request_id and r.client_id = auth.uid()
  )
);

-- Status history: same as requests
create policy "history access" on public.status_history for select using (
  exists (
    select 1 from public.requests r where r.id = request_id
    and (
      r.client_id = auth.uid()
      or public.my_role() in ('manager','tech','coordinator','scaffold','insulation','painting')
    )
  )
);
