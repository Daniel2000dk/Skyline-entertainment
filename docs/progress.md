# Voortgang

_Laatst bijgewerkt: 2026-10-14 — fase B afgerond_

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

## Afgerond — fase B (projectmanagement)

- ✅ **Projecten** (slice 1): evenementtypen met standaardtaken, project aanmaken vanuit een
  template, details bewerken (project + evenement in één keer), status, team en rechten, checklist,
  draaiboek, geschiedenis met terugzetten, verwijderen met bevestiging. Uitloggen wist nu ook
  verborgen pagina's uit de browser.
- ✅ **Taken** (slice 2): Kanban (Mijn taken / Alle taken en per project), taak toevoegen,
  bewerken en verwijderen, deadlines met "te laat"-markering, prioriteit, checklist per taak.
  Uitvoerders zonder bewerkrecht kunnen hun eigen taak voortzetten en afvinken.
- ✅ **Discussies en suggesties** (slice 3): discussies per project, taak en suggestie met één
  niveau antwoorden; bewerken door de auteur, verwijderen door auteur of admin. Suggesties per veld
  of algemeen; de eigenaar accepteert (wordt direct en terugdraaibaar toegepast) of wijst af; de
  auteur kan intrekken.
- ✅ **Ideeënbord en bijlagen** (slice 4): ideeën delen, stemmen, discussiëren en afbeeldingen
  toevoegen; admins en Event Managers keuren goed of af en zetten een idee met één klik om naar een
  project (naam, omschrijving en standaardtaken worden overgenomen; de discussie blijft gekoppeld).
  Bestanden per project en idee in privé-opslag: alleen afbeeldingen en PDF (gecontroleerd op
  inhoud), max. 4 MB, alleen via de eigen site en na sessiecontrole, met sandbox-CSP.
- ✅ **Planning** (slice 5): gezamenlijke agenda (dag/week/maand; op mobiel als lijst) met
  evenementen, deadlines van taken en teamactiviteiten — afgeleid van bestaande gegevens, niets
  dubbel invoeren. Evenementen verplaatsen vanuit de agenda (duur schuift mee); teamactiviteiten met
  verantwoordelijke.
- ✅ **Dashboard** (slice 6): kerncijfers (gehouden en komende evenementen, open en afgeronde
  taken, open ideeën), grafiek "Evenementen per dag/maand" met tabelweergave, komende evenementen
  en recente projectactiviteit; filters week/maand/kwartaal/jaar/eigen periode. Deelnames en
  geldbedragen volgen in fase C/D.
- 🔒 Rate limiting met glijdend venster (geen dubbel budget op venstergrenzen).

## In uitvoering

- Fase C voorbereiden: GTA-kaartmateriaal (licentie-onderzoek), publieke evenementpagina's,
  inschrijven met Turnstile.

## Openstaande punten

- **Productie nog niet bijgewerkt**: Supabase-project `skyline-entertainment` en Vercel zijn
  gekoppeld en de productieconfig staat klaar (`[remotes.production]`), maar migraties,
  auth-instellingen en Vercel-variabelen worden pas toegepast na jouw toestemming. Tot die tijd
  staat zelfregistratie in het Supabase-project nog open (zonder tabellen; geen risico voor data).
- **E-mail voor zelfbediening "wachtwoord vergeten"**: werkt online pas met een eigen SMTP-dienst.
  Tot die tijd maakt een Administrator een inloglink via Team.
- **GTA-kaartmateriaal (fase C)**: licentie-onderzoek nodig voordat er tiles worden gebruikt.

## Testresultaten (lokaal, 2026-10-14)

| Suite                        | Resultaat        | Dekt onder meer                                                                       |
| ---------------------------- | ---------------- | ------------------------------------------------------------------------------------- |
| Vitest (unit)                | 108/108 geslaagd | Validatie, datum/tijdzone, agenda- en periodelogica, bestandsherkenning, labels       |
| pgTAP (database)             | 205/205 geslaagd | RLS per rol, cross-project, taken/uitvoerders, suggesties, ideeën, opslag, dashboard  |
| Playwright (e2e)             | 59/59 geslaagd   | Auth, MFA, rollen, projecten, taken, discussies, ideeën, bestanden, agenda, dashboard |
| Lint, types, Prettier, build | geslaagd         | Ook op GitHub Actions                                                                 |
| Supabase advisors            | geen meldingen   |                                                                                       |

## Acties voor jou

1. **Toestemming voor productie** (staat nog open): migraties toepassen op je Supabase-project,
   auth-instellingen pushen, de Vercel-variabelen zetten, een nieuwe productie-deploy en je
   Administrator-account. Zie het overzicht in het chatbericht.
2. **Fase C: Cloudflare Turnstile** (gratis): Cloudflare-account en een Turnstile-widget aanmaken.
   Ik geef de exacte stappen zodra fase C begint.

## Volgende stap

Fase C: GTA-kaart (na licentiekeuze), route-editor, publieke evenementpagina's, inschrijven met
alleen de RP-naam, Turnstile, rate limiting en beheer van inschrijvingen.
