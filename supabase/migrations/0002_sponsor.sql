-- ============================================================================
-- Connect Fort Worth - sponsor branding (admin-managed logo + link)
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- Sponsor website link (the logo in the header points here).
alter table public.events add column if not exists sponsor_url text;

-- Public bucket for admin-uploaded sponsor logos.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Public read (the header is public); only admins may write.
drop policy if exists branding_public_read on storage.objects;
create policy branding_public_read on storage.objects
  for select using (bucket_id = 'branding');

drop policy if exists branding_admin_insert on storage.objects;
create policy branding_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'branding' and public.is_admin());

drop policy if exists branding_admin_update on storage.objects;
create policy branding_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'branding' and public.is_admin());

drop policy if exists branding_admin_delete on storage.objects;
create policy branding_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'branding' and public.is_admin());
