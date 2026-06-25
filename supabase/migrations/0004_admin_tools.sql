-- ============================================================================
-- Connect Fort Worth - editable site content + admin reset (delete) policies
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- Editable copy (single 'main' row, JSONB of key -> text). Public read so the
-- public pages can render it; admin write.
create table if not exists public.site_content (
  id         text primary key default 'main',
  content    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

drop policy if exists site_content_read on public.site_content;
create policy site_content_read on public.site_content
  for select using (true);

drop policy if exists site_content_write on public.site_content;
create policy site_content_write on public.site_content
  for all using (public.is_admin()) with check (public.is_admin());

grant select on public.site_content to anon, authenticated;
grant insert, update on public.site_content to authenticated;

insert into public.site_content (id, content)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

-- Admin "reset all data": allow admins to delete attendees + actions.
drop policy if exists attendees_delete_admin on public.attendees;
create policy attendees_delete_admin on public.attendees
  for delete to authenticated using (public.is_admin());

drop policy if exists actions_delete_admin on public.attendee_actions;
create policy actions_delete_admin on public.attendee_actions
  for delete to authenticated using (public.is_admin());

grant delete on public.attendees to authenticated;
grant delete on public.attendee_actions to authenticated;
