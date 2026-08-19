# CivicPulse AI — role separation, portal split, and full redesign

The uploaded project is intact and will be reused as-is: TanStack Start app, Supabase schema (11 tables, RLS, `has_role`, triggers for status history, support counts, reopen notifications), Gemini image analysis + resolution assessment server functions, priority scoring, receipt PDF, Leaflet maps, emergency + voice-note columns and storage bucket. Nothing gets replaced with mock data.

## What is actually broken today

- `AppShell` gives admins `[...citizenLinks, ...adminLinks]`, and `/admin/queue` only checks `isAdmin` for enabling its query — a citizen can open the URL, see the admin shell, and the page just renders empty instead of blocking. There is no route-level or server-side role gate anywhere.
- Role is read client-side from `user_roles` in the auth provider; every admin write goes straight from the browser to the table. `complaints_update_own_or_admin` and the evidence policies do enforce admin at the DB layer, but `notifications_insert_authenticated`, `escalations_insert`, and `ai_analyses_insert` allow any signed-in user to write.
- Citizen and Authority use one shared shell, so the two experiences look the same.
- Language selector is local state in the header and translates nothing.
- No credentials in this copy, so the app can't reach your Supabase project or Gemini until secrets are set.

## Step 1 — Bring the project in and reconnect it

Copy the source (no `.git`, no `.vercel`, no `.env`) into this workspace, keep `supabase/migrations` as the source of truth, and store your credentials as secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`. I'll prompt you for each. Then verify sign-in, a complaint read, and one Gemini call actually work before any redesign.

## Step 2 — Role architecture (done before any UI work)

- Route split: `src/routes/_citizen/*` (dashboard, report, my-reports, community, map, notifications, help, profile) and `src/routes/_authority/*` (queue, cases, case detail, map, escalations, profile). Each layout gates its own subtree client-side, and the role comes from the database, never from the login screen.
- New `/unauthorized` page. A citizen hitting any authority URL lands there with a link back to their dashboard; an authority hitting a citizen-only workflow URL is sent to the Action Queue.
- Post-login routing is decided by the queried role: CITIZEN → citizen home, ADMIN → Action Queue. Choosing "Authority" on the landing page for a non-admin account explains that the account has no authority role instead of silently showing citizen UI.
- Server-side authorization: every admin mutation (assign, start work, evidence upload, resolution submit, escalate, reopen, notify citizen) moves into `createServerFn` handlers with `requireSupabaseAuth` that re-check `has_role(userId,'ADMIN')` before writing. New migration tightens `notifications`, `escalations`, and `ai_analyses` insert policies so a citizen cannot forge notifications or escalations, and adds owner-scoped read policies where public-read is too broad.
- Admin accounts stay manual: you set the `ADMIN` row in `user_roles`. The authority sign-in screen states this and shows a clear "this account is not authorised" message otherwise.

## Step 3 — Design system

Rebuild `src/styles.css` tokens around an Indian public-service identity: white/light surfaces, deep navy for text and primary actions, saffron accents for urgency/highlights, green for resolved/verified states, restrained borders and flat cards. No glassmorphism, no gradients, no neon, no decorative charts, no invented statistics. Accessible contrast, large touch targets, icon + text labels. Persistent "Prototype / Demo — not an official government service" marker; CivicPulse AI branding throughout.

## Step 4 — Landing page

Two large, visually distinct choices (Citizen / Authority) with their one-line purposes, plus branding, language selector, Help link, and the prototype notice. No marketing filler.

## Step 5 — Citizen portal

Calm, task-first shell: Home, Report Issue, My Reports, Community, Map, Notifications, Help. Dashboard counts come from real queries (active, awaiting verification, resolved, recent reports) — no placeholders. The existing wizard (image → AI analysis → edit → location → duplicate check → priority → submit → receipt) is preserved, with editable AI output, the three location methods and the "Is this the location of the issue?" confirmation kept mandatory, plus the record/stop/play/re-record voice note. Complaint page shows Before → Work in progress → After with timestamps and status history, then the verify / not-resolved action (reason required, optional evidence, reopens and notifies authority).

## Step 6 — Authority portal

Separate control-room shell: dark navy chrome, dense layout, navigation limited to Action Queue, Cases, Map, Escalations, Profile. No citizen navigation, no report wizard.

Action Queue is the landing screen, sorted emergency/critical → priority score → severity → time pending, each row showing ID, photo, issue, category, location, severity, priority, community support, emergency flag, status, assigned department, time pending, and the single action required. Emergencies are visually unmistakable.

Case detail becomes a dedicated operational page: complaint → AI analysis → location → duplicates → community support → priority reasoning → assignment → work started → progress evidence → resolution evidence → citizen verification → final result. Voice note is playable here with its transcript when transcription succeeded. Actions (Assign, Start Work, Upload Progress, Submit Resolution, Upload Before/After, Escalate, Reopen) render only when valid for the current status, and each one writes through an authorised server function.

## Step 7 — Emergency, language, help, receipt

- Emergency stays a scored assessment from severity, safety risk, danger answers, image and extra evidence, and location context — never "user ticked the box". Result shown as HIGH/MEDIUM/LOW with a plain-language explanation, feeding the queue's top priority. Clear note that CivicPulse is not an emergency service; no real numbers invented.
- Centralized translation dictionary (English, Hindi, Marathi) with a persisted selector driving the citizen interface; no hardcoded strings on citizen screens.
- Help/Support covering reporting, tracking, community support, verification, FAQ, accessibility, and a clearly labelled `Prototype Support: +91-XXXXXXXXXX` placeholder.
- Receipt PDF redesigned as a professional acknowledgement (branding, ID, timestamp, issue, category, severity, location, priority, status, existing QR), explicitly marked as not an official government receipt.

## Step 8 — Verification

Once secrets are in place I run your end-to-end scenario in a headless browser: citizen login → dashboard → manual `/admin/queue` blocked → logout → authority login → straight to Action Queue with no citizen nav → open, assign, start work, progress evidence, before/after resolution → citizen sees evidence → verify/reject → status syncs back. Plus emergency, voice note, location selection, duplicate detection, receipt download, and language switching.

## Technical notes

- Server-side authorization lives in `*.functions.ts` with `requireSupabaseAuth`; `supabaseAdmin` is only loaded inside handlers after the admin check.
- Gemini stays server-only in `src/lib/ai.functions.ts` reading `process.env['GEMINI_API_KEY']` inside the handler; the `VITE_GEMINI_API_KEY` fallback is removed so the key can never reach the browser.
- Schema changes ship as new migrations (policy tightening, emergency assessment fields if needed); existing migrations are not rewritten and your data is untouched.
- Authenticated routes stay `ssr: false` behind the layout gates, matching the current Supabase session model.

## Needs your input during the build

Supabase URL, publishable key, service role key, and the Gemini API key — I'll open a secret prompt for each. Without them the app builds but can't sign in or call AI.
