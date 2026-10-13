# Skyline Entertainment

Evenementenplatform voor Skyline Entertainment binnen GTA RP: een publieke site waar spelers zich
met alleen hun GTA RP-naam inschrijven, en een afgeschermd intern systeem voor projecten, planning,
deelnemers en financiën. Draait volledig op gratis tiers (Vercel Hobby, Supabase Free, Cloudflare
Turnstile).

**Stack:** Next.js 16 (App Router, TypeScript strict), Tailwind CSS v4, shadcn/ui, Supabase
(PostgreSQL + RLS + Auth), Zod, Vitest, Playwright, pgTAP.

## Documentatie

- [docs/setup.md](docs/setup.md): lokaal ontwikkelen en online omgevingen koppelen
- [docs/architecture.md](docs/architecture.md): architectuur, datamodel, fasering en risico's
- [docs/decisions.md](docs/decisions.md): technische beslissingen
- [docs/progress.md](docs/progress.md): voortgang, testresultaten en openstaande acties
- [CLAUDE.md](CLAUDE.md): projectregels (centrale bron)

## Snel starten

```bash
npm install
npm run db:start            # vereist Docker
cp .env.example .env.local  # vul in met: npx supabase status -o env
npm run dev
```

## Claude Code-skills

`.claude/skills/` bevat werkinstructies per onderwerp: `architecture-planning`, `supabase-security`,
`public-registration-abuse`, `gta-map-editor`, `event-project-workflows`, `crm-finance-reporting`,
`ui-ux-accessibility`, `github-vercel-release`, `quality-security-testing`.

## Let op

Zonder geverifieerde speler-ID is het onmogelijk te garanderen dat één persoon zich maar één keer
inschrijft. Technische signalen beperken misbruik, maar zijn geen identiteitsbewijs.
