# Connect Fort Worth

An event networking directory web app for **Access Fort Worth**. Attendees check
in with a selfie + profile, browse everyone in the room, filter by industry, and
tap to text or save a contact. Organizers get a live, admin-only analytics
dashboard. Mobile-first web app (no native app, no install required).

Built with **Next.js (App Router) + TypeScript + Tailwind**, **Supabase**
(auth, Postgres, Storage), and **PostHog** (product analytics), deployed on
**Vercel**.

The design source of truth is [`reference/prototype.html`](reference/prototype.html).

---

## Stack & architecture

- **Anonymous attendee auth.** On first request, `middleware.ts` signs visitors
  in anonymously (via `@supabase/ssr`) so they get a stable `auth.uid()` with
  zero friction. The Join form then writes their `attendees` row.
- **Admins / superadmin.** Email + password accounts. Roles live in `profiles`
  and are enforced server-side. `/stats` redirects non-admins, and the Stats tab
  is hidden unless the session role is admin. At the database level, the
  `attendee_actions` table is **select-only for admins** via RLS, so analytics
  can't leak even if the UI is bypassed.
- **Tracking layer.** Every meaningful interaction calls `track()`
  ([`src/lib/track.ts`](src/lib/track.ts)), which writes to Supabase
  `attendee_actions` (source of truth for the dashboard) **and** mirrors to
  PostHog. Events: `signup`, `photo_uploaded`, `profile_view`, `search`,
  `sms_click`, `vcard_download`.
- **PostHog reverse proxy.** `next.config.ts` rewrites `/ingest/*` to PostHog so
  events survive ad blockers. The client points at `/ingest`.

```
src/
  app/
    page.tsx              Join (selfie + profile form)
    directory/            Directory + profile sheet
    stats/                Admin-only dashboard (server-guarded)
    info/                 Event info + organizer sign-in link
    admin/login/          Organizer email+password sign-in
    api/stats/            Admin-guarded dashboard JSON (refresh/realtime)
  components/             AppShell chrome, join, directory, stats, info
  lib/                    track, vcard, sms, stats aggregation, types, constants
  utils/supabase/         browser + server clients, session middleware
  middleware.ts           session refresh + anonymous sign-in
supabase/migrations/      0001_init.sql  (schema, RLS, roles, storage, seed)
```

---

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, paste all of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), run it.
   This creates the tables, indexes, RLS policies, the `is_admin()` /
   `is_superadmin()` helpers, the `selfies` storage bucket, and seeds the live event.
3. **Authentication → Providers → Anonymous** → enable **"Allow anonymous
   sign-ins"**. (Without this, attendees can't join.)
4. *(Optional, for live dashboard updates)* **Database → Replication** (or
   **Realtime**) → add `public.attendee_actions` to the realtime publication.
   If you skip this, the dashboard still refreshes every 25s by polling.
5. Copy **Project Settings → API**: the **Project URL** and the **publishable**
   (or anon) key into `.env.local` (see below).

### Create your organizer (superadmin)

```sql
-- After creating a user in Authentication → Users → Add user:
update public.profiles set role = 'superadmin'
where id = (select id from auth.users where email = 'you@accessfortworth.com');
```

A **superadmin** can then promote others to `admin` (same statement with
`role = 'admin'`). Only superadmins can change roles - enforced by the
`profiles_update_superadmin` policy.

---

## 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # anon key also works
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=/ingest
NEXT_PUBLIC_SPONSOR_LOGO_URL=              # optional
```

`SUPABASE_SECRET_KEY` is reserved for future server jobs; the dashboard does not
need it. For an **EU** PostHog project, also set `POSTHOG_API_HOST` /
`POSTHOG_ASSET_HOST` (see the example file).

---

## 3. Run locally

```bash
npm install
npm run dev      # http://localhost:3000
```

Open it on your phone (same network) for the intended full-screen experience.

> **Note on this working copy:** the project currently lives under a
> Dropbox-synced path. `node_modules/` and `.next/` should not be synced - either
> exclude them via Dropbox **selective sync**, or clone to an off-Dropbox path
> for active development. Vercel builds from git, so dependencies never need to
> sync anywhere.

---

## 4. Deploy to Vercel

1. Push this folder to a Git repo and **Import** it in Vercel.
2. Add the **Supabase integration** (syncs `NEXT_PUBLIC_SUPABASE_URL` and keys),
   or set the env vars manually.
3. Add `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST=/ingest`, and the
   sponsor URL in **Project Settings → Environment Variables**.
4. In Supabase **Authentication → URL Configuration**, add your Vercel domain to
   the redirect/site URLs.
5. Deploy. Verify: an attendee can join and appears in the directory; PostHog
   **Activity** shows events arriving via `/ingest`.

---

## Data model

| Table | Purpose |
|---|---|
| `events` | event metadata + sponsor + `is_live` |
| `profiles` | one row per auth user; `role` ∈ attendee/admin/superadmin |
| `attendees` | the directory row (name, company, industry, phone, email, photo, looking_for, open_to_contact) |
| `attendee_actions` | every tracked interaction; **admin select-only** (powers the dashboard) |

**RLS summary:** directory is readable by authenticated users for
`open_to_contact = true` rows (plus your own row, plus everything for admins);
you can only insert/update your own attendee row; anyone authenticated can log
their own actions but **only admins can read them**; events are public-read /
admin-write; only superadmins can change roles. `is_admin()` is a
`SECURITY DEFINER` function so policies never recurse on `profiles`.

**Storage:** `selfies` bucket, public-read; users may upload only into their own
`{auth.uid()}/…` folder.
