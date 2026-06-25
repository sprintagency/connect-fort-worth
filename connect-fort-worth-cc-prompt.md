# Claude Code build prompt - Connect Fort Worth

> Paste everything below into Claude Code from an empty project folder. Drop these three files in first so it has them to work from:
> - `reference/prototype.html` - the working prototype (visual + interaction reference)
> - `public/access-fort-worth-white.png` - primary logo (white, for navy backgrounds)
> - `public/sprint-white.svg` - "built by" logo (white)

---

Build a production-ready mobile web app called **Connect Fort Worth** - an event networking directory for Access Fort Worth. It is a web app only (no native app, no app-store, no PWA install requirement). Attendees check in, add a selfie + profile, browse everyone in the room, filter by industry, and tap to text or save a contact. Organizers get a live analytics dashboard that is **admin-only**.

There is a finished visual prototype at `reference/prototype.html`. Match its look, layout, copy, and interactions closely - it is the source of truth for design. Your job is to turn it into a real Next.js app backed by Supabase and instrumented with PostHog, deployed on Vercel.

## Stack

- **Next.js** (latest, App Router, TypeScript, `src/` dir) + **Tailwind CSS**
- **Supabase** for auth, Postgres, and Storage (selfies). Use the **`@supabase/ssr`** package with `@supabase/supabase-js` (the old `@supabase/auth-helpers-nextjs` is deprecated - do not use it). Create browser + server client utilities under `src/utils/supabase/` and a `middleware.ts` to refresh sessions.
- **PostHog** for product analytics. Client via `posthog-js` + `posthog-js/react` `PostHogProvider`; server via `posthog-node`. Set up a **reverse proxy** with Next.js `rewrites` (route `/ingest/*` → PostHog) so events aren't eaten by ad blockers.
- **Vercel** for hosting.

Keep it a single Next.js app. Mobile-first, fills the viewport like a native web app on a phone; show the desktop device-frame styling only at wider widths if convenient (optional).

## Brand

Primary brand is **Access Fort Worth**. Pull exact values from the prototype, but the system is:

- Navy `#0B2A4A` (surfaces/brand), deep navy `#07203A`, navy accent `#1B4476`
- Orange `#F0531F` (primary action), hover `#D8461A`
- Light app background `#F2F5FA`, ink `#142433`, slate `#5E6F80`, hairline `#E4EAF1`
- Sprint lime `#B5E602` used only inside the footer logo
- Fonts: **Space Grotesk** (display/headings/numbers) + **Inter** (body/UI) via `next/font/google`

Persistent chrome on every screen:
- **Header**: Access Fort Worth logo (left) + a **sponsor logo slot** (right) labeled "PRESENTED BY". The sponsor image/URL must be configurable (env var `NEXT_PUBLIC_SPONSOR_LOGO_URL` or an `event` row field) and render a dashed placeholder when empty.
- **Footer band** above the tab bar on every page: "This app was built by" + the Sprint logo, on a navy bar.
- **Bottom tab bar**: Join · Directory · Info for attendees. The **Stats** tab only renders for admins (see roles).

## Auth & roles

- **Attendees**: zero-friction. On first load, sign them in with **Supabase anonymous auth** to get a stable `auth.uid()`. The signup form then creates/updates their `attendees` row linked to that uid. (If you prefer phone OTP using the cell number they enter, that's an acceptable alternative - note the tradeoff in the README.)
- **Admins / superadmin**: email + password accounts. A **superadmin** can promote other users to `admin`. Roles live in a `profiles` table keyed to `auth.users`. The Stats route, the analytics API, and the analytics RLS policies are all restricted to `admin`/`superadmin`.
- Replace the prototype's demo passcode gate with **real role-based access**: server-side check the user's role before rendering `/stats`; redirect non-admins. The tab itself is hidden unless the session role is admin.

Avoid the classic RLS recursion bug: implement a `public.is_admin()` SECURITY DEFINER function that reads `profiles.role`, and use it inside policies instead of subquerying `profiles` directly.

## Data model (Supabase / Postgres)

Create a migration with these tables. Add sensible defaults, `created_at timestamptz default now()`, FKs, and indexes on `industry`, `event_id`, and `attendee_actions(action_type, created_at)`.

- **events** - `id`, `name`, `event_date`, `venue`, `sponsor_name`, `sponsor_logo_url`, `is_live boolean`
- **profiles** - `id (uuid, = auth.users.id)`, `role text check in ('attendee','admin','superadmin') default 'attendee'`
- **attendees** - `id`, `auth_uid (uuid → auth.users)`, `event_id (→ events)`, `first_name`, `last_name`, `company`, `industry`, `phone`, `email`, `photo_url`, `open_to_contact boolean default true`, `looking_for text[]` (values: New clients, Partners, Vendors, Investors, Hiring, Networking), `agreed_terms boolean`
- **attendee_actions** - `id`, `event_id`, `actor_attendee_id (→ attendees, nullable)`, `target_attendee_id (→ attendees, nullable)`, `action_type text`, `metadata jsonb`, `created_at`. `action_type` values: `signup`, `photo_uploaded`, `profile_view`, `search`, `sms_click`, `vcard_download`.

**Storage**: a `selfies` bucket for profile photos. Authenticated users may upload their own photo; public read for directory display (or signed URLs if you'd rather keep it private - your call, document it).

**RLS** (enable on all tables):
- `attendees`: anyone authenticated can `select` rows where `open_to_contact = true` (the directory); a user can `insert`/`update` only their own row (`auth_uid = auth.uid()`).
- `attendee_actions`: authenticated users can `insert` their own actions; **only admins can `select`** (this is what keeps analytics admin-only at the database level).
- `profiles`: a user reads their own row; only superadmin can update `role`.
- `events`: public read; admin write.

## Screens / routes

Mirror the prototype:

1. **`/` - Join**: navy hero, "Connect Fort Worth", selfie capture/upload (→ Supabase Storage), then the profile form (first/last name, company, industry select, cell, email, "open to being contacted" toggle, "what are you looking for?" chips, agree-to-terms). On submit → write the `attendees` row, fire `signup`, route to Directory. No skyline graphic - hero is solid navy.
2. **`/directory` - Directory**: search box (name/company/role) + industry filter, list of attendee cards (gradient initials avatar, name, "open" dot, company, industry chip, SMS + vCard icon buttons). Tapping a card opens the profile sheet.
3. **Profile sheet** (over Directory): selfie, name, company·industry, "looking for" tags, **Tap to text** and **Save vCard**, contact rows. Fire `profile_view` on open.
4. **`/stats` - Event dashboard (ADMIN ONLY)**: "Connections made" hero metric (= `sms_click` + `vcard_download` counts), KPI cards (attendees, active today, SMS taps, vCard saves), Top industries donut (share of directory), most-connected companies leaderboard, recent-activity feed. Pull all numbers from `attendee_actions` / `attendees` via an admin-guarded server query or API route. Should reflect real data and update on refresh (bonus: Supabase Realtime subscription for live updates).
5. **`/info` - Info**: event details, how-it-works, data/privacy note. (No passcode box - admin sign-in lives at `/admin/login` or similar.)

## Tracking layer (do both)

Every meaningful interaction writes to **Supabase `attendee_actions`** (source of truth) **and** calls **`posthog.capture()`** (product analytics). Use one small helper, e.g. `track(action_type, { target_attendee_id, ...props })`, that does both. Events to wire up: `signup`, `photo_uploaded`, `profile_view`, `search` (with `industry`/`query`), `sms_click` (with `target_attendee_id`), `vcard_download` (with `target_attendee_id`). Identify the PostHog user with the attendee id once known.

## vCard + SMS behavior

- **Save vCard**: generate a valid vCard 3.0 client-side (N, FN, ORG, TITLE, TEL;TYPE=CELL, EMAIL, NOTE="Met at Access Fort Worth"), download as `First_Last.vcf`. Fire `vcard_download` first.
- **Tap to text**: open `sms:+1{digits}?&body={prefilled}` with a friendly prefilled message. Fire `sms_click` first.

## Env vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=     # new publishable key (anon key also works during transition)
SUPABASE_SECRET_KEY=                       # server-only (service role / secret key) for admin queries
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=/ingest           # via reverse proxy
NEXT_PUBLIC_SPONSOR_LOGO_URL=
```

## Build order

1. Scaffold Next.js + Tailwind + fonts; port the brand tokens and shared chrome (header, sponsor slot, footer, tab bar) from the prototype.
2. Supabase project: migration (tables + RLS + `is_admin()`), Storage bucket, client/server utils, middleware, anonymous auth.
3. Join flow → real attendee row + selfie upload.
4. Directory + profile sheet (live data), SMS + vCard, `track()` helper wired to Supabase + PostHog.
5. Roles + admin login; gate `/stats`; build the dashboard from real aggregates.
6. PostHog provider + reverse proxy; verify events land.
7. `README.md` with setup, the SQL, how the superadmin promotes an admin, and deploy steps.
8. Deploy to Vercel; connect the Supabase integration so env vars sync; add `NEXT_PUBLIC_POSTHOG_*` and sponsor URL in Vercel project settings.

## Done means

- An attendee can join, upload a selfie, appear in the directory, and text/save anyone - on a phone, on the web.
- A non-admin can never see `/stats` or read `attendee_actions` (enforced by RLS, not just the UI).
- The dashboard shows real counts that move as actions happen.
- Events appear in both Supabase and PostHog.
- It deploys clean to Vercel.

Ask me before making product decisions that change the schema or the attendee auth model. Otherwise, build it.
