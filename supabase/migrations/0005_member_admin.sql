-- ============================================================================
-- Connect Fort Worth - let organizers (admins) edit any attendee.
-- (Admin delete was added in 0004; this adds admin update.)
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

drop policy if exists attendees_update_admin on public.attendees;
create policy attendees_update_admin on public.attendees
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
