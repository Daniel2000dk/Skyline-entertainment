# Skyline Entertainment — Claude Code starter

Copy `CLAUDE.md` and the `.claude/skills/` folder to the root of your new GitHub repository. These are build instructions, **not yet the application**. Open that repository in Claude Code, then use the prompt below.

## Starter prompt for Claude Code

Read `CLAUDE.md` and every relevant skill. Build phase A first. Inspect repository state, propose architecture and a practical sequence, then implement the initial scaffold, staff-only auth, database migrations/RLS tests, design system and GitHub CI. Do not build public accounts. Before generating a public signup, implement durable rate limiting, server-side Turnstile validation and atomic capacity/unique name constraints. Do not deploy to production without my explicit approval. Show test results and required Vercel/Supabase configuration.

## Skills included

- `architecture-planning`
- `supabase-security`
- `public-registration-abuse`
- `gta-map-editor`
- `event-project-workflows`
- `crm-finance-reporting`
- `ui-ux-accessibility`
- `github-vercel-release`
- `quality-security-testing`

## Suggested services
- GitHub: source control and code review.
- Vercel: hosting and preview deployments.
- Supabase: PostgreSQL, RLS, staff auth and storage.
- Cloudflare Turnstile: anti-bot verification.
- Redis/Upstash or comparable managed KV: durable rate limiting.
- Leaflet: mapping UI; GTA tiles must be independently licensed/approved.

## Note
Without a verified real player ID, it is impossible to guarantee one human signs up only once. Technical signals can reduce abuse but must not be presented as identity proof.
