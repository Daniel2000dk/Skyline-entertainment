# CLAUDE.md — Skyline Entertainment

## Mission
Build Skyline Entertainment: a secure, fast, easy-to-use GTA RP event management platform. Public visitors can browse events and sign up using only their GTA RP character name. Internal staff use a protected project management dashboard. Optimize for simplicity, reliability, privacy, and resistance to deliberate abuse.

## Product requirements — source of truth
1. Public website: list upcoming/past events, detail pages, visible spots, price/rules, single-field GTA RP name signup and clear success/failure messages. **No public account, password, email, phone number, Discord, or real-life identity required.** No guest access to internal routes or data.
2. Internal dashboard: staff authentication; shared calendar; event/project creation, templates and status; event plans and schedules; GTA V map with route drawing, markers/checkpoints, start/finish and route versioning; tasks with assignees, deadlines and checklist; threaded discussion and suggestions; owner-controlled editing permissions; activity log.
3. CRM: participant records by entered RP name, event attendance history, signup statuses and optional staff notes; never assume names uniquely identify humans.
4. Event finances: entry fee, expected/received income, expenses, prize payouts, profit and reports. Separate pledged/expected from confirmed paid; use explicit event currency (GTA dollars), not real money. Manual payment entry initially; no real-money payments.
5. Stats: events held, registrations, checked-in participants, revenue, costs and profits by period and event type. Clearly distinguish counts of signups from actual attendance, and confirmed payments from projections.
6. Team: staff-only roles (admin, organizer, team_member); project owner; collaborative comments and suggestions; all authorized staff can see projects; direct editing depends on project permissions. Project owner/admin can approve/reject suggestions. Audit sensitive changes.

## Non-negotiable security and privacy rules
- Public and internal access are separated **at server authorization, database privileges and RLS**, not only UI or middleware redirects. Do not return internal data in API responses, client bundles, metadata or public caches.
- All internal routes and data mutations verify a staff session AND current role/membership server-side. Never trust client-supplied staffId, role, projectOwner or money totals. Protect against IDOR and unauthorized cross-project writes.
- Use managed auth for staff only, secure sessions and reset mechanism; invite staff instead of allowing public staff signup. Recommend MFA for staff, especially admins. Require reauthentication for sensitive account actions.
- Public event registration has NO personal-data fields beyond voluntarily entered RP character name. Do not demand email or device identification. Explain any security processing in a short privacy notice. No invasive persistent device fingerprinting.
- Server-side Turnstile verification, per-IP / per-network and per-event rate limits, cookie-based best-effort repeat detection, casefolded normalized name matching for the same event, and an atomic transaction enforcing event capacity and one active signup per normalized name per event. IP is a weak signal: never a unique person identifier; do not permanently ban shared connections on IP alone. Cookies can be cleared; VPNs can bypass IP rules. **Never claim one-person-one-signup is guaranteed without a verified identity.**
- Prefer limiting repeated attempts and queuing suspicious signups for manual review, with optional organizer approval for high-stakes events. No CAPTCHA-only security. Return generic, non-enumerating error responses; do not reveal whether a named player is registered unnecessarily.
- Cap input sizes and normalize carefully; validate at server boundary (Zod). Prevent XSS by safe rendering; parameterize SQL; CSRF-protect cookie-authenticated mutations; rate-limit read/write routes where necessary.
- Use short retention for raw security logs, minimize IP storage or use short-lived keyed digests where feasible; never expose IPs to regular staff. Document retention and deletion policy. Do not log tokens, secrets, full cookies or sensitive request bodies.
- RLS ON and least-privilege grants for all exposed tables. Public API queries must select only whitelisted, published fields. Supabase secret/service keys only on trusted server, never NEXT_PUBLIC_* and never sent to browser. Private storage for internal attachments/routes unless intentionally published.
- Production secrets only in Vercel environment variables and local .env.local (gitignored). .env.example may contain names, no values. Different credentials/environments for preview versus production.
- Protect destructive actions with authorization, confirmation and activity logging. Test security regressions before deploy.

## Suggested stack
- Next.js App Router + TypeScript strict mode, Tailwind CSS, accessible UI components, Zod, React Hook Form where useful.
- Supabase PostgreSQL, RLS, staff Supabase Auth, Storage where needed. Use database migrations in git.
- Leaflet / React Leaflet for the GTA V map; choose map tiles/assets only after checking actual license and GTA-to-map coordinate transform. Map itself and routes should support zoom/pan, drag-to-edit points, mobile usability and route persistence.
- Cloudflare Turnstile with server validation, durable rate limits in Redis/Upstash or equivalent (NOT in-memory counters in Vercel serverless), and event registration stored through a controlled server function.
- Vitest for unit/integration, Playwright for critical end-to-end flows; lint and typecheck on CI.
- GitHub repository linked to Vercel, PR previews, protected main branch, review/test gates for production.
- Keep dependencies current and verify their APIs with official docs before using them; do not hardcode unverified version numbers.

## Domain model (starting point, refine before migration)
- staff_profiles, staff_roles / memberships
- projects (event or other), project_members, project_permissions
- events, event_types, event_schedules, event_routes, route_points
- tasks, task_assignments, checklists
- discussions, comments, suggestions, activity_log
- participants (entered RP names; no claim of real-world uniqueness), registrations (event_id, normalized_name, status), checkins
- financial_entries (amount, currency, category, direction, status, recorded_by, date)
- optional security_rate_limits and abuse_flags (minimal data, retention)
Make foreign keys and indexes explicit. Build an active-registration uniqueness constraint carefully: canceled registrations may be reactivated per policy but cannot reserve multiple concurrent spots. Capacity management must be concurrency safe and resilient to retries. Never calculate authoritative financial totals solely on the client.

## Core flows and acceptance criteria
### Public registration
1. Visitor views published event; sees capacity and registration rules.
2. Types GTA RP name only; click to register.
3. Backend verifies Turnstile; validates event open status, capacity, normalized name uniqueness, rate limit, and optional approval mode in an atomic flow.
4. Returns success/queued/full/already-registered/rate-limited error without exposing private records. Duplicate concurrent requests cannot create a second active registration or oversell capacity.
5. Staff can review, approve/reject, check in, cancel, and flag abusive records.

### Internal event work
- Organizer creates event/project from a template, schedules it, places checkpoints/routes on GTA map, assigns tasks and sets publish status. Staff can comment and suggest; only permitted editors may directly change content. Audit important actions. Public sees only deliberately published information.

### Finances
- Staff records expected and received entry fees and expenses with audit trail. Dashboard reconciles received amounts, not assumptions from signup count. Void/correction processes retain history.

## UX principles
- Minimal steps and no clutter; mobile-first public, responsive internal.
- Dutch interface by default. Clear friendly error states; keyboard access; proper contrast; loading/empty states; confirmations for irreversible actions.
- Visually polished dark entertainment brand (charcoal, near-black, white, restrained gold); no fake data in production.
- Keep navigation lean: Dashboard, Planning, Events/Projects, Tasks, Map (within projects), CRM, Finance, Team/Settings.
- For public: Events, Event detail, Registration. Never surface internal navigation or links to private files.

## Engineering workflow for Claude
1. Inspect existing repository and README before making changes; do not overwrite user work.
2. Propose a small, explicit implementation plan and file list for each significant feature.
3. Implement one vertical slice at a time with migrations, authorization, validation, UI and tests together. Prefer understandable code over abstraction.
4. Run format/lint/typecheck/unit tests, then e2e smoke/security tests after changes; fix failures. If a command cannot run, report that clearly.
5. Keep a `docs/decisions.md` for key architectural tradeoffs and `docs/progress.md` for completed work, next steps and blockers. Update both as needed.
6. Before changing auth, RLS, event registration uniqueness, financial logic or production settings, check impact and tests. Never weaken security just to make tests pass.
7. Never commit secrets, production data, identifiable IP logs or licensed map assets without permissions.
8. Use feature branches and PRs; Vercel previews before production. Never deploy to production or run destructive database migrations without explicit approval.
9. In final response after each coding task include: what changed, files touched, tests run, remaining issues, and exact next action.

## Initial build order
A. Repo scaffold, design system, database schema, RLS policy tests, staff invitations/auth, CI and Vercel preview.
B. Internal event/project CRUD, planning/calendar, collaboration, tasks and project permissions.
C. Public event pages and minimal name-only registration with concurrency safe capacity + anti-abuse and staff moderation.
D. GTA map tiles licensing/coordinate calibration, route editor, persistence and version history.
E. CRM, manual finance ledger and reporting.
F. Audit hardening, accessibility, e2e/abuse testing, backups, production launch checklist.
Deliver deployable slices, not six unfinished modules at once.

## Claude skills
Read the task-relevant skill under `.claude/skills/` when working in that area. Skills are workflow instructions, not magic installed libraries; actual dependencies and connections must be set up separately.
