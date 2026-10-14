# Voortgang

_Laatst bijgewerkt: 2026-10-14 — fase B in uitvoering_

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
- Branch protection op `main`: alleen via pull request met groene CI; geen force-push of verwijderen.
- Script voor de eerste Administrator (`scripts/create-admin.mjs`).
- MFA (TOTP via authenticator-app): instellen en uitzetten via **Account**, code-stap bij het
  inloggen, afgedwongen in de database (`aal2`), admin-reset bij verloren telefoon, audit-log.

## In uitvoering — fase B (projectmanagement)

- ✅ **Projecten** (slice 1): evenementtypen met standaardtaken, project aanmaken vanuit een
  template, details bewerken (project + evenement in één keer), status, team en rechten, checklist,
  draaiboek, geschiedenis met terugzetten, verwijderen met bevestiging. Uitloggen wist nu ook
  verborgen pagina's uit de browser.
- ⏳ Taken (Kanban), discussies en suggesties, bijlagen en ideeënbord, agenda, dashboard.

## Openstaande punten

- **Vercel en Supabase koppelen** (alleen jij kunt dit): zie "Acties voor jou".
- **E-mail voor zelfbediening "wachtwoord vergeten"**: werkt online pas met een eigen SMTP-dienst.
  Tot die tijd maakt een Administrator een inloglink via Team.
- **GTA-kaartmateriaal (fase C)**: licentie-onderzoek nodig voordat er tiles worden gebruikt.

## Testresultaten (lokaal, 2026-10-13)

| Suite                        | Resultaat        | Dekt onder meer                                                                                                    |
| ---------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Vitest (unit)                | 43/43 geslaagd   | Open-redirect-bescherming, validatie, wachtwoordregels, digest, sessieversheid                                     |
| pgTAP (database)             | 102/102 geslaagd | anon, buitenstaander, gedeactiveerd, elke rol, rol-escalatie, cross-project, audit, MFA (aal2), schema-invarianten |
| Playwright (e2e)             | 39/39 geslaagd   | Directe API-aanroepen geweigerd, login, rollen, uitnodigen, herstel, throttling, MFA, mobiel                       |
| Lint, types, Prettier, build | geslaagd         | Ook op GitHub Actions (CI groen op PR #1)                                                                          |
| Supabase advisors            | geen meldingen   | Beveiliging en performance van het schema                                                                          |

## Acties voor jou

1. **Supabase-project voor previews** aanmaken en instellen: [setup.md §1](setup.md#1-supabase-project-voor-previews).
2. **Vercel-project** importeren en de vier Preview-variabelen zetten: [setup.md §2](setup.md#2-vercel-project).
3. **Eerste Administrator** op de preview aanmaken: [setup.md §3](setup.md#3-eerste-administrator-op-de-preview).
4. Pull request reviewen en mergen wanneer je tevreden bent.

## Volgende stap

Na jouw koppeling van Supabase en Vercel: de online preview controleren en PR #1 mergen. Daarna
fase B (dashboard, agenda, projecten, taken, discussies, suggesties, ideeënbord).
