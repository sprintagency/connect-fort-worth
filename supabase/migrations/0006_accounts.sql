-- ============================================================================
-- 0006 accounts: persistent profiles + per-event check-in + "Your Offering"
-- ============================================================================
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY guards.
--
-- This turns attendee identity into real, reusable accounts:
--   * profiles  = the persistent member record (who you are, remembered forever)
--   * attendees = a per-event check-in snapshot (copied from profiles at check-in)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Persistent member fields on profiles
-- (profiles rows are auto-created for every auth user by handle_new_user())
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists first_name      text,
  add column if not exists last_name       text,
  add column if not exists company         text,
  add column if not exists job_title       text,
  add column if not exists industry        text,
  add column if not exists phone           text,
  add column if not exists email           text,
  add column if not exists photo_url       text,
  add column if not exists open_to_contact boolean not null default true,
  add column if not exists looking_for     text[]  not null default '{}',
  add column if not exists offering        text,
  add column if not exists agreed_terms    boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. Per-event "Your Offering" snapshot on the check-in row
-- ---------------------------------------------------------------------------
alter table public.attendees
  add column if not exists offering text;

-- ---------------------------------------------------------------------------
-- 3. Let users edit their OWN profile (but never their role)
-- ---------------------------------------------------------------------------
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

grant update on public.profiles to authenticated;

-- Role-escalation guard: an authenticated end-user can't change `role`.
-- (RLS is column-blind, so this BEFORE trigger pins role to its old value.)
-- auth.uid() is NULL for the service role / SQL editor, so manual promotions
-- (`update profiles set role='admin' ...`) are intentionally NOT restricted.
create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and not public.is_superadmin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role_trg on public.profiles;
create trigger profiles_guard_role_trg
  before update on public.profiles
  for each row execute function public.profiles_guard_role();

-- ---------------------------------------------------------------------------
-- 4. Public attendee count for the logged-out Info screen
-- (SECURITY DEFINER so it works without a session; returns a bare integer)
-- ---------------------------------------------------------------------------
create or replace function public.directory_count(p_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int from public.attendees
  where p_event_id is null or event_id = p_event_id;
$$;

revoke all on function public.directory_count(uuid) from public;
grant execute on function public.directory_count(uuid) to anon, authenticated;

-- ============================================================================
-- This migration is purely ADDITIVE and safe to run on the current live site
-- BEFORE the new code deploys (it does not change directory visibility).
--
-- Rollout order:
--   1. Run THIS migration (0006).
--   2. Authentication → Providers → Email: ensure Email is enabled and turn
--      OFF "Confirm email" so accounts work instantly at the event.
--   3. Deploy the new code (git push origin main).
--   4. Run 0007_directory_members_only.sql to lock the directory to real
--      accounts (do this AFTER deploy - it would empty the directory on the
--      old anonymous-session code).
--   5. (Optional) Authentication → Providers: disable "Anonymous sign-ins".
-- ============================================================================
