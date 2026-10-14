# CLAUDE.md — Skyline Entertainment

## Mission
Build Skyline Entertainment: a secure, fast, easy-to-use GTA RP event management platform. Public visitors can browse events and sign up using only their GTA RP character name. Internal staff use a protected project management dashboard. Optimize for simplicity, reliability, privacy, low maintenance and resistance to deliberate abuse. It must be a working application with real database functionality, never a mock-up.

## Product requirements — source of truth
1. Public website: list upcoming/past events, detail pages (date/time, location, rules, entry fee, visible spots), single-field GTA RP name signup ("GTA RP-naam" + one "Inschrijven" button) and clear success/failure messages. **No public account, password, email, phone number, Discord, or real-life identity required.** No guest access to internal routes or data. Optionally a random, unguessable signup reference (treated as a secret; never grants access to other players' data).
2. Internal dashboard: stat cards and charts (events held/upcoming, participations, income, costs, net result, open tasks, upcoming events, recent activity) with week/month/quarter/year/custom filters, using real data and server-side calculations.
3. Planning: shared calendar (day/week/month) linked to projects: events, deadlines, tasks and team activities; open events from the calendar; reschedule; assign responsible staff. Calendar is derived from existing data where possible — never enter the same data twice.
4. Projects: one project space per event with name, event type, description, owner, members, date/time, location, status, budget, entry fee, max participants, checklist, runbook (draaiboek), attachments, tasks, discussions and GTA map routes. Status flow: Idee → In bespreking → Goedgekeurd → In voorbereiding → Gepubliceerd → Afgerond → Gearchiveerd, or Geannuleerd. All staff can view and give feedback; the owner assigns edit rights; staff can post suggestions without changing the original; owner/admin accepts or rejects; threads on ideas, project parts and suggestions; record who changed what; important content changes can be reverted.
5. Tasks: title, description, assignee, deadline, priority, status, comments; checklist and Kanban view; task templates per recurring event type.
6. GTA V map and route planner (Leaflet): zoom/pan, start/finish, checkpoints, draw/edit routes by clicking on the map, delete points, markers with notes, multiple routes per event, persisted in the database. Use only map material whose use is legally and technically permitted; research licenses, never buy access automatically.
7. Ideas board: add ideas with description and images, feedback threads, voting, approval, convert approved ideas into projects while keeping the original discussions; avoid duplicate entry.
8. CRM: one central participant administration by entered RP name with history, events, signup dates, payment status, amounts, notes, totals; search/sort/filter and simple export. Never suggest that merged RP names prove real identity. Staff approve/reject/cancel/delete registrations within their rights.
9. Event finances: entry fee, received/open payments, prize money, organization costs, other expenses, revenue, profit/loss; manual "received" marking; no real payment provider (all payments happen in GTA RP, currency GTA dollars); consistent transaction ledger without double counting; reports per event, month and event type.
10. Team: staff-only roles — `admin` (UI: Administrator), `organizer` (UI: Event Manager), `team_member` (UI: Medewerker). Staff accounts only via controlled invitations; self-registration impossible; secure password reset; MFA (TOTP) preferred. Audit sensitive changes.

## Non-negotiable security and privacy rules
- Public and internal access are separated **at server authorization, database privileges and RLS**, not only UI or proxy redirects. Do not return internal data in API responses, client bundles, metadata or public caches.
- All internal routes and data mutations verify a staff session AND current role/membership server-side. Never trust client-supplied staffId, role, projectOwner or money totals. Protect against IDOR and unauthorized cross-project writes.
- Use managed auth for staff only, secure sessions and reset mechanism; invite staff instead of allowing public staff signup. Recommend MFA for staff, especially admins. Require reauthentication for sensitive account actions.
- Public event registration has NO personal-data fields beyond voluntarily entered RP character name. Do not demand email or device identification. Explain any security processing in a short privacy notice. No invasive persistent device fingerprinting.
- Server-side Turnstile verification, per-IP / per-network and per-event rate limits, cookie-based best-effort repeat detection, casefolded normalized name matching for the same event, and an atomic transaction enforcing event capacity and one active signup per normalized name per event. IP is a weak signal: never a unique person identifier; do not permanently ban shared connections on IP alone. Cookies can be cleared; VPNs can bypass IP rules. **Never claim one-person-one-signup is guaranteed without a verified identity.**
- Prefer limiting repeated attempts and queuing suspicious signups for manual review, with optional organizer approval for high-stakes events. No CAPTCHA-only security. Return generic, non-enumerating error responses; do not reveal whether a named player is registered unnecessarily.
- Cap input sizes and normalize carefully; validate at server boundary (Zod). Prevent XSS by safe rendering; parameterize SQL; CSRF-protect cookie-authenticated mutations; rate-limit read/write routes where necessary.
- Use short retention for raw security logs, minimize IP storage or use short-lived keyed digests where feasible; never expose IPs to regular staff. Security data is never used for marketing. Document retention and deletion policy. Do not log tokens, secrets, full cookies or sensitive request bodies.
- RLS ON and least-privilege grants for all exposed tables. Public API queries must select only whitelisted, published fields. Supabase secret/service keys only on trusted server, never NEXT_PUBLIC_* and never sent to browser. Private storage for internal attachments/routes unless intentionally published.
- Production secrets only in Vercel environment variables and local gitignored env files. .env.example may contain names, no values. Different credentials/environments for preview versus production. The GitHub repo is **public**: never commit secrets, tokens or real personal data, and never rely on code secrecy.
- Protect destructive actions with authorization, confirmation and activity logging. Test security regressions before deploy, including tests that prove abuse is actually refused.
- Never ask the owner to paste secret keys into the chat.
- The only owner email that may appear anywhere people can see it (UI, staff list, auth/sender emails, contact or privacy notice, SMTP sender) is **zuiderveenandrew@gmail.com**. Never use or show the owner's private address, and never write it into the repo. Commits use the repo-local git identity with that address.

## Cost and efficiency constraints — non-negotiable
- **The project must not cost money.** Use only free tiers (GitHub Free, Vercel Hobby, Supabase Free, Cloudflare Turnstile free). Never enable paid plans, add-ons, paid APIs or usage-based billing, and never add a service that requires a credit card, without the owner's explicit approval. No VPS, Kubernetes, microservices, external AI services or unnecessary background processes.
- Vercel Hobby is for non-commercial use only: no real-money payments, ads or paid work through the site. If a free plan's terms stop fitting the use, report it before implementing an alternative.
- Prefer capabilities we already have over extra services (e.g. durable rate limiting in Supabase Postgres instead of a separate KV store). Stay well inside free-tier quotas: no unnecessary realtime, storage, egress, cron jobs or serverless invocations. Keep public pages static/cacheable.
- Work as efficiently as possible: smallest change that meets the requirement, no speculative features, reuse existing components/code, minimal dependencies. Keep CI fast and cheap (run only what the change needs, cache dependencies, cancel superseded runs).
- Cloudflare is used only for Turnstile. Hosting stays on Vercel.

## Stack (decided)
- Next.js 16 App Router + TypeScript strict, Tailwind CSS v4, shadcn/ui (base-nova, Base UI primitives), Zod; React Hook Form for complex interactive forms; Recharts for dashboards.
- Supabase PostgreSQL with RLS, Supabase Auth for staff only, Storage (private) where needed. Migrations in `supabase/migrations`.
- Leaflet for the GTA V map (licensed/permitted tiles only, documented coordinate transform).
- Cloudflare Turnstile (server-side validation), durable rate limits in Postgres (`public.consume_rate_limit`), registration only through a controlled database function.
- Vitest (unit), pgTAP via `supabase test db` (RLS/database), Playwright (e2e, desktop + mobile); lint, typecheck and build on CI.
- GitHub (feature branches + PRs, CI), Vercel Git previews; production deploys are disabled from `main` (`vercel.json`) and happen only through the approved release procedure in `docs/setup.md` (migrations, auth config, clean export of `main` + `vercel deploy --prod`, then the live smoke test `playwright.live.config.ts`).
- Supabase Free allows two active projects (one is the owner's DPPS project, which must never be touched), so `skyline-entertainment` (ref `rjgizkedtrmaezvnlbis`) is the only hosted database and it is production. Previews have no backend variables; internal pages there answer 503 by design.
- Keep dependencies current and verify APIs against official docs (for Next.js: `node_modules/next/dist/docs/`, see AGENTS.md) before using them.

## Codebase conventions
- Read `AGENTS.md`: this Next.js version differs from older training data. `src/proxy.ts` replaces middleware; Cache Components are on, so session-dependent UI must sit behind `<Suspense>`.
- Supabase is used **server-side only** (`src/lib/supabase/server.ts` as the user, `admin.ts` with the secret key only for Auth admin calls and the rate limiter, after authorizing the caller).
- Every internal page and Server Action calls `requireStaff()` / `requireRole()` from `src/lib/auth/staff.ts` (the DAL; it calls `connection()` so auth always runs per request). Data functions authorize themselves too.
- Database authorization lives in `private.*` helpers (`is_staff`, `is_admin`, `has_any_role`, `can_edit_project`, `can_manage_project`). New tables: RLS on, `revoke all` from anon/authenticated, explicit column grants, audit trigger (`private.audit_row_change`), pgTAP tests per role including cross-project denial. `supabase/tests/database/05_security_baseline.test.sql` enforces schema-wide invariants (anon has nothing unless whitelisted there).
- Money is integer GTA dollars (`bigint`); authoritative totals are computed server-side.
- UI text is Dutch; code, comments and commit messages are English.
- Commands: `npm run check`, `npm run test:db`, `npm run test:e2e`, `npm run db:start|db:reset|db:types`, `npm run admin:create`. See `docs/setup.md`.

## Core flows and acceptance criteria
### Public registration
1. Visitor views published event; sees capacity and registration rules.
2. Types GTA RP name only; click to register.
3. Backend verifies Turnstile; validates event open status, capacity, normalized name uniqueness, rate limit, and optional approval mode in an atomic flow.
4. Returns success/queued/full/already-registered/rate-limited error without exposing private records. Duplicate concurrent requests cannot create a second active registration or oversell capacity.
5. Staff can review, approve/reject, check in, cancel, and flag abusive records. Suspicious patterns (high frequency, many signups per connection, repeated failures, automation) are flagged for review, not auto-banned.

### Internal event work
- Organizer creates event/project from a template, schedules it, places checkpoints/routes on GTA map, assigns tasks and sets status. Staff can comment and suggest; only permitted editors may directly change content. Audit important actions. Public sees only deliberately published information.

### Finances
- Staff records expected and received entry fees and expenses with audit trail. Dashboard reconciles received amounts, not assumptions from signup count. Void/correction processes retain history.

## UX principles
- Minimal steps and no clutter; mobile-first public, responsive internal. Feels like a simple management tool, not complex business software.
- Dutch interface by default. Clear friendly error states; keyboard access; proper contrast; loading/empty states; confirmations for irreversible actions; autosave only where reliable.
- Official brand kit (see `docs/decisions.md` D28): black #0A0A0A, anthracite #1A1A1A panels, dark grey #2C2C2C, gold #D4AF37 only for primary actions, active navigation, focus and small highlights, white type; Montserrat headings, Inter UI text; SE mark + wordmark via `src/components/brand/logo.tsx`. Public pages lively (key visual, brand pillars); internal pages calm and functional (no large photos). No busy animations; no fake data in production.
- Keep navigation lean: Dashboard, Planning, Projecten, Taken, Ideeën, CRM, Financiën, Team. Only show modules that exist.
- For public: Events, Event detail, Registration. Never surface internal navigation or links to private files.

## Engineering workflow for Claude
1. Inspect existing repository and README before making changes; do not overwrite user work.
2. Propose a small, explicit implementation plan and file list for each significant feature.
3. Implement one vertical slice at a time with migrations, authorization, validation, UI and tests together. Prefer understandable code over abstraction.
4. Run format/lint/typecheck/unit tests, database tests, then e2e smoke/security tests after changes; fix failures. If a command cannot run, report that clearly.
5. Keep `docs/decisions.md` (tradeoffs), `docs/architecture.md` (plan/data model) and `docs/progress.md` (done, in progress, open issues, test results, owner actions) current.
6. Before changing auth, RLS, event registration uniqueness, financial logic or production settings, check impact and tests. Never weaken security just to make tests pass.
7. Never commit secrets, production data, identifiable IP logs or licensed map assets without permissions.
8. Use feature branches and PRs; Vercel previews before production. Several Claude sessions may share this working directory: do your own work in a separate `git worktree`, and push migrations or deploy only from a clean export of `origin/main` (`supabase db push --workdir <export>`), checking that the dry-run lists exactly the expected migrations. Never deploy to production or run destructive database migrations without explicit approval.
9. Work autonomously on ordinary engineering choices; ask only when the owner's input or external permission is truly needed, and then give only the necessary steps. Never claim functionality is done unless implemented and tested.
10. In the final response after each coding task include: what changed, files touched, tests run, remaining issues, and exact next action.

## Build order (phases)
A. Foundation: Next.js/TypeScript/Tailwind, Supabase config, database design, staff auth and permissions, design system and base navigation, CI and Vercel preview.
B. Project management: dashboard, calendar, projects, tasks, discussions, suggestions, ideas board.
C. Events: GTA map, route editor, event management, public event pages, signup form, Turnstile, rate limiting, registration management.
D. Administration: CRM, financial ledger, statistics, reports, exports.
E. Finish: functional, security and mobile tests, UX and performance, documentation, preview deployment, production preparation.
Finish a phase before starting large new parts. Deliver deployable slices, not unfinished modules.

## Claude skills
Read the task-relevant skill under `.claude/skills/` when working in that area. Skills are workflow instructions, not magic installed libraries; actual dependencies and connections must be set up separately.
