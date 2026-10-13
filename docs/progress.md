# Voortgang

_Laatst bijgewerkt: 2026-10-13 — fase A (branch `feat/phase-a-foundation`)_

## Afgerond

**Fase A — fundament**

- Repository gekoppeld aan GitHub; werk via feature branch en pull request.
- Next.js 16 (App Router, TypeScript strict), Tailwind v4, Prettier, ESLint, Vitest, Playwright.
- Design system: shadcn/ui in Skyline-huisstijl (donker, antraciet, wit, gouden accenten),
  toegankelijke focusstijl, grotere touch targets, Nederlandse schermlezerteksten.
- Database (Supabase, 4 migraties): medewerkers, uitnodigingen, projecten met statusflow, projectleden
  (editor/commenter), evenementen, append-only activiteitenlog, duurzame rate limiter.
  RLS op elke tabel, deny-by-default rechten, helpers in een niet-blootgesteld schema.
- Medewerkersauthenticatie: alleen via uitnodiging; inloggen met rate limiting per IP en per account;
  uitnodigings- en herstellinks (eenmalig, 1 uur geldig, pas verbruikt na klik); wachtwoord instellen
  vereist een verse sessie; wachtwoord vergeten zonder account-enumeratie; uitloggen.
- Rechten: Administrator / Event Manager / Medewerker, server-side gecontroleerd per pagina en actie
  én in de database. Teambeheer voor admins: uitnodigen, rol wijzigen, (de)activeren (inclusief
  Auth-blokkade), nieuwe inloglink.
- Interne basisnavigatie (desktop-zijbalk, mobiel menu), dashboard-welkom, "geen toegang"-pagina.
- Beveiligingsheaders (CSP, framing, referrer, HSTS), `noindex` op interne routes, `robots.txt`.
- CI (GitHub Actions): formattering, lint, types, unit-tests, build, pgTAP- en e2e-tests tegen een
  tijdelijke Supabase in de runner.
- `vercel.json`: geen automatische productie-deploys vanaf `main`.
- Script voor de eerste Administrator (`scripts/create-admin.mjs`).

## In uitvoering

- MFA (TOTP via authenticator-app) voor medewerkers; gratis in Supabase Free.

## Openstaande punten

- **Vercel en Supabase koppelen** (alleen jij kunt dit): zie "Acties voor jou".
- **Branch protection op `main`** activeren zodra CI één keer groen is op GitHub.
- **E-mail voor zelfbediening "wachtwoord vergeten"**: werkt online pas met een eigen SMTP-dienst.
  Tot die tijd maakt een Administrator een inloglink via Team.
- **GTA-kaartmateriaal (fase C)**: licentie-onderzoek nodig voordat er tiles worden gebruikt.

## Testresultaten (lokaal, 2026-10-13)

| Suite                        | Resultaat      | Dekt onder meer                                                                                        |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------------------------------ |
| Vitest (unit)                | 43/43 geslaagd | Open-redirect-bescherming, validatie, wachtwoordregels, digest, sessieversheid                         |
| pgTAP (database)             | 83/83 geslaagd | anon, buitenstaander, gedeactiveerd, elke rol, rol-escalatie, cross-project, audit, schema-invarianten |
| Playwright (e2e)             | 35/35 geslaagd | Directe API-aanroepen geweigerd, login, rollen, uitnodigen, herstel, throttling, mobiel                |
| Lint, types, Prettier, build | geslaagd       |                                                                                                        |
| Supabase advisors            | geen meldingen | Beveiliging en performance van het schema                                                              |

## Acties voor jou

1. **Supabase-project voor previews** aanmaken en instellen: [setup.md §1](setup.md#1-supabase-project-voor-previews).
2. **Vercel-project** importeren en de vier Preview-variabelen zetten: [setup.md §2](setup.md#2-vercel-project).
3. **Eerste Administrator** op de preview aanmaken: [setup.md §3](setup.md#3-eerste-administrator-op-de-preview).
4. Pull request reviewen en mergen wanneer je tevreden bent.

## Volgende stap

Fase A afronden met MFA en de online preview controleren; daarna fase B (dashboard, agenda,
projecten, taken, discussies, suggesties, ideeënbord).
