# Connect Fort Worth - build kit

Everything you need to build the app with Claude Code.

## What's inside
- `connect-fort-worth-cc-prompt.md` - the build prompt. Paste the whole thing into Claude Code from this folder.
- `reference/prototype.html` - the working visual prototype. Open it in any browser (or on your phone) to preview the app. It's the design source of truth for the build.
- `public/access-fort-worth-white.png` - primary logo (white, for navy backgrounds).
- `public/sprint-white.svg` - the "built by Sprint" footer logo.

## How to use
1. Unzip this folder and open it in your terminal / Claude Code.
2. Open `connect-fort-worth-cc-prompt.md`, copy all of it, and paste it into Claude Code as your first instruction.
3. The prompt already references `reference/prototype.html` and the two logos in `public/`, so Claude Code will pick them up.
4. You'll need free accounts for Supabase, PostHog, and Vercel - Claude Code will walk you through wiring the keys.

## Quick preview
Just want to see it on your phone? Email or AirDrop `reference/prototype.html` to yourself and open it - it runs fully standalone. To unlock the admin Stats screen in the prototype, go to Info → Organizer access and enter `afw2026` (this is a demo gate only; the real app uses database-enforced roles).
