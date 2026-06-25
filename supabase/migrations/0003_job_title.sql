-- ============================================================================
-- Connect Fort Worth - add job title to attendees
-- Run in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

alter table public.attendees add column if not exists job_title text;
