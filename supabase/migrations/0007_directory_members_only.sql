-- ============================================================================
-- 0007 directory members-only: hide attendee rows from anonymous sessions
-- ============================================================================
-- Defense-in-depth for "the directory requires an account". The app already
-- (a) no longer mints anonymous sessions and (b) redirects non-members away
-- from /directory - this also enforces it at the row level for direct API hits
-- using a stale anonymous token.
--
-- IMPORTANT: run this AFTER the new code is deployed. On the old
-- anonymous-session code, excluding anonymous users empties the directory.
-- Safe to re-run.
-- ============================================================================

drop policy if exists attendees_select_directory on public.attendees;
create policy attendees_select_directory on public.attendees
  for select to authenticated
  using (
    coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and (open_to_contact = true or auth_uid = auth.uid() or public.is_admin())
  );
