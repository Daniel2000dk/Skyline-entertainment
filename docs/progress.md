# Voortgang

_Laatst bijgewerkt: 2026-10-14 — fase A, B, huisstijl en GTA-kaart live in productie_

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

## Productie (live sinds 2026-10-14)

- <https://skylineentertainment.vercel.app> draait `main` (fase A + B) met de productie-database
  `skyline-entertainment`: 13 migraties toegepast, auth-instellingen gezet (zelfregistratie uit,
  wachtwoord min. 12 tekens met letters en cijfers, veilig wachtwoord wijzigen, site-URL), Vercel-
  variabelen alleen voor Production.
- Administrator-account **Daniel** (zuiderveenandrew@gmail.com) aangemaakt via een eenmalige link.
- Livetest geslaagd (zie hieronder); het tijdelijke testaccount en al zijn gegevens zijn verwijderd.
- Previews hebben bewust geen backend (zie beslissing D25).
- Tweede release (2026-10-14): huisstijl en GTA-kaart. Migratie `20261015100000_map_routes.sql`,
  kaartafbeelding in de privé-bucket `maps`, deploy van `main`; livetest inclusief kaart geslaagd en
  opgeruimd.
- **Incident**: bij die release ging ook `20261016100000_username_login.sql` mee, een nog niet
  gecommitte migratie van een parallelle sessie in dezelfde map. Nagelezen (alleen toevoegingen; de
  live site werkt ermee) en op besluit van de eigenaar blijft hij staan. Die migratie mag niet meer
  worden aangepast; wijzigingen gaan in een nieuwe migratie. Sindsdien gaan migraties alleen nog
  vanuit een schone export van `origin/main` (D30).

## Huisstijl (live sinds 2026-10-14)

- Officiële brandkit doorgevoerd: zwart/goud-kleuren, Montserrat + Inter, SE-logo (vector + echte
  tekst), favicon/app-iconen, linkvoorbeeld (Open Graph). Publieke homepage met sfeerbeeld en
  merkpijlers; login met groot logo; intern rustig met goud alleen voor knoppen, actieve navigatie
  en focus. Gecontroleerd met screenshots op desktop (1440 px) en mobiel (Pixel 7).

## Fase C (evenementen) — in uitvoering

- ✅ **GTA-kaart en route-editor** (slice 1, live sinds 2026-10-14): tabblad **Kaart** per
  project. Zoomen en verschuiven; meerdere routes per evenement in vijf kleuren; punten zetten door
  op de kaart te klikken, verslepen, verwijderen, checkpoints, start/finish of rondgang; markers met
  notitie. Alle medewerkers kijken mee; alleen eigenaar, editors en admins tekenen. Kaartafbeelding
  privé (alleen medewerkers), opgeslagen in de database met auditlog.
- Volgende: publieke evenementpagina's, inschrijven met alleen de RP-naam, Turnstile, beheer van
  inschrijvingen.

## Openstaande punten

- **E-mail voor "wachtwoord vergeten"**: online niet bruikbaar zonder eigen SMTP (Supabase Free
  mailt alleen naar leden van de Supabase-organisatie). Een Administrator maakt een inloglink via
  **Team**; voor de enige Administrator kan het script `create-admin.mjs` een nieuwe link maken.
- **Kaartresolutie**: de aangeleverde kaart is 533 × 800 pixels; inzoomen wordt daardoor snel
  wazig. Een grotere versie van dezelfde kaart kan later zonder routes te verliezen worden
  vervangen (routes worden relatief aan de afbeelding opgeslagen).
- **npm audit**: 9 meldingen (hoog) in ontwikkeltools (`eslint-config-next`, `shadcn`-CLI via
  `braces`/`micromatch`); niet in de site zelf. Oplossen zodra er een compatibele update is.
- **Teampagina zonder paginering**: prima voor een normaal team; lokaal met honderden
  testaccounts werd hij traag (e2e-test faalde tot de lokale database werd geleegd).

## Testresultaten (2026-10-14)

| Suite                        | Resultaat        | Dekt onder meer                                                                     |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------------- |
| Vitest (unit)                | 119/119 geslaagd | Validatie, datum/tijdzone, agenda, periodes, bestanden, kaartcoördinaten, labels    |
| pgTAP (database)             | 222/222 geslaagd | RLS per rol, cross-project, taken, suggesties, ideeën, opslag, dashboard, kaart     |
| Playwright (e2e)             | 62/62 geslaagd   | Auth, MFA, rollen, projecten, taken, discussies, ideeën, bestanden, agenda, kaart   |
| Livetest productie           | 1/1 geslaagd     | Headers, RLS via publieke API, login, alle modules, privé bestanden, 2FA, uitloggen |
| Lint, types, Prettier, build | geslaagd         | Ook op GitHub Actions                                                               |
| Supabase advisors            | geen meldingen   |                                                                                     |

## Acties voor jou

1. Open de eenmalige link uit de chat (1 uur geldig), stel je wachtwoord in en zet onder
   **Account** tweestapsverificatie aan.
2. **Fase C: Cloudflare Turnstile** (gratis): Cloudflare-account en een Turnstile-widget aanmaken.
   Ik geef de exacte stappen zodra het inschrijfformulier klaar is.

## Volgende stap

Fase C: GTA-kaart en route-editor, publieke evenementpagina's, inschrijven met alleen de RP-naam,
Turnstile, rate limiting en beheer van inschrijvingen.
