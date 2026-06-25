-- ============================================================================
-- Connect Fort Worth - initial schema, RLS, roles, storage
-- ============================================================================
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY guards.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  event_date       date,
  venue            text,
  sponsor_name     text,
  sponsor_logo_url text,
  is_live          boolean not null default true,
  created_at       timestamptz not null default now()
);

-- One profile per auth user. Role drives admin access. Created automatically
-- by the handle_new_user() trigger below (fires for anonymous users too).
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'attendee'
               check (role in ('attendee','admin','superadmin')),
  created_at timestamptz not null default now()
);

create table if not exists public.attendees (
  id              uuid primary key default gen_random_uuid(),
  auth_uid        uuid not null references auth.users(id) on delete cascade,
  event_id        uuid references public.events(id) on delete set null,
  first_name      text not null,
  last_name       text not null,
  company         text,
  industry        text,
  phone           text,
  email           text,
  photo_url       text,
  open_to_contact boolean not null default true,
  looking_for     text[] not null default '{}',
  agreed_terms    boolean not null default false,
  created_at      timestamptz not null default now(),
  -- one attendee row per user per event (enables clean upsert on re-join)
  unique (auth_uid, event_id)
);

create table if not exists public.attendee_actions (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid references public.events(id) on delete set null,
  actor_attendee_id  uuid references public.attendees(id) on delete set null,
  target_attendee_id uuid references public.attendees(id) on delete set null,
  action_type        text not null,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists attendees_industry_idx       on public.attendees (industry);
create index if not exists attendees_event_id_idx        on public.attendees (event_id);
create index if not exists attendees_auth_uid_idx        on public.attendees (auth_uid);
create index if not exists actions_event_id_idx          on public.attendee_actions (event_id);
create index if not exists actions_type_created_idx      on public.attendee_actions (action_type, created_at desc);
create index if not exists actions_target_idx            on public.attendee_actions (target_attendee_id);

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER → avoids the classic RLS recursion bug:
-- policies call these instead of subquerying public.profiles directly).
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','superadmin')
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin'
  );
$$;

revoke all on function public.is_admin()       from public;
revoke all on function public.is_superadmin()  from public;
grant execute on function public.is_admin()      to anon, authenticated;
grant execute on function public.is_superadmin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever an auth user is created
-- (includes anonymous sign-ins). Default role = 'attendee'.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'attendee')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.events           enable row level security;
alter table public.profiles         enable row level security;
alter table public.attendees        enable row level security;
alter table public.attendee_actions enable row level security;

-- events: public read, admin write -----------------------------------------
drop policy if exists events_select_all on public.events;
create policy events_select_all on public.events
  for select using (true);

drop policy if exists events_write_admin on public.events;
create policy events_write_admin on public.events
  for all using (public.is_admin()) with check (public.is_admin());

-- profiles: read own (admins read all); only superadmin updates role --------
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_superadmin on public.profiles;
create policy profiles_update_superadmin on public.profiles
  for update using (public.is_superadmin()) with check (public.is_superadmin());

-- attendees: directory read (open rows), self read/write, admin read all -----
drop policy if exists attendees_select_directory on public.attendees;
create policy attendees_select_directory on public.attendees
  for select to authenticated
  using (open_to_contact = true or auth_uid = auth.uid() or public.is_admin());

drop policy if exists attendees_insert_self on public.attendees;
create policy attendees_insert_self on public.attendees
  for insert to authenticated
  with check (auth_uid = auth.uid());

drop policy if exists attendees_update_self on public.attendees;
create policy attendees_update_self on public.attendees
  for update to authenticated
  using (auth_uid = auth.uid()) with check (auth_uid = auth.uid());

-- attendee_actions: insert own actions; ONLY admins may select --------------
-- (this is what keeps analytics admin-only at the database level)
drop policy if exists actions_insert_self on public.attendee_actions;
create policy actions_insert_self on public.attendee_actions
  for insert to authenticated
  with check (
    actor_attendee_id is null
    or exists (
      select 1 from public.attendees a
      where a.id = actor_attendee_id and a.auth_uid = auth.uid()
    )
  );

drop policy if exists actions_select_admin on public.attendee_actions;
create policy actions_select_admin on public.attendee_actions
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Table grants (RLS still governs rows; these govern table-level access)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.events to anon, authenticated;
grant select, insert, update on public.attendees to authenticated;
grant select on public.profiles to authenticated;
grant insert, select on public.attendee_actions to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: selfies bucket (public read; users write only their own folder)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('selfies', 'selfies', true)
on conflict (id) do nothing;

drop policy if exists selfies_public_read on storage.objects;
create policy selfies_public_read on storage.objects
  for select using (bucket_id = 'selfies');

drop policy if exists selfies_insert_own on storage.objects;
create policy selfies_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'selfies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists selfies_update_own on storage.objects;
create policy selfies_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'selfies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists selfies_delete_own on storage.objects;
create policy selfies_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'selfies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Seed: the live event (matches the prototype's Info screen)
-- ---------------------------------------------------------------------------

insert into public.events (name, event_date, venue, sponsor_name, sponsor_logo_url, is_live)
select 'Access Fort Worth · Spring Mixer', date '2026-05-15', 'Sundance Square', null, null, true
where not exists (select 1 from public.events);

-- ============================================================================
-- After running:
--   1. Authentication → Providers → enable "Anonymous sign-ins".
--   2. Create your organizer auth user (Authentication → Users → Add user),
--      then promote them:
--        update public.profiles set role = 'superadmin'
--        where id = (select id from auth.users where email = 'you@example.com');
--   3. A superadmin can then promote others to 'admin' the same way (or in-app).
-- ============================================================================
