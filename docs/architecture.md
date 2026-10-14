# Architectuur en implementatieplan

Compact plan voor het Skyline Entertainment-platform. Beslissingen en hun afwegingen staan in
[decisions.md](decisions.md), de actuele stand in [progress.md](progress.md).

## 1. Overzicht

Eén Next.js-applicatie (App Router, TypeScript strict) op Vercel, met Supabase (PostgreSQL + Auth)
als enige backend. Twee strikt gescheiden omgevingen:

| Omgeving   | Routes                                   | Toegang                    |
| ---------- | ---------------------------------------- | -------------------------- |
| Publiek    | `/`, (fase C) `/evenementen/[slug]`      | Iedereen, geen account     |
| Auth-flows | `/login`, `/bevestigen`, `/wachtwoord-*` | Medewerkers (uitnodiging)  |
| Intern     | `/intern/**`                             | Alleen actieve medewerkers |

```
Browser ──HTTPS──▶ Vercel (Next.js)
                     ├─ proxy.ts        sessie verversen + snelle redirect (optimistisch)
                     ├─ Server Components / Server Actions
                     │    └─ DAL (src/lib/auth/staff.ts): JWT + actief profiel per request
                     └─ Supabase-clients (alleen server-side)
                          ├─ gebruikerssessie  → RLS beslist per rij
                          └─ secret key        → alleen Auth-admin en rate limiter
                                   ▼
                        Supabase Postgres (RLS op elke tabel, audit-triggers)
```

**Verdediging in lagen:** (1) proxy-redirect, (2) autorisatie in elke pagina en Server Action
(`requireStaff` / `requireRole`), (3) Postgres RLS + kolomrechten + guard-triggers. De browser
praat nooit rechtstreeks met Supabase; er staat geen Supabase-sleutel in de clientbundel.

## 2. Rollen en rechten

| Database      | Interface     | Kan                                                                 |
| ------------- | ------------- | ------------------------------------------------------------------- |
| `admin`       | Administrator | Alles, inclusief medewerkers uitnodigen, rollen en (de)activeren    |
| `organizer`   | Event Manager | Projecten/evenementen aanmaken en beheren, taken, deelnemers        |
| `team_member` | Medewerker    | Projecten bekijken, feedback/suggesties, toegewezen taken uitvoeren |

Per project: **eigenaar** (beheer: status, leden, eigendom, verwijderen), leden met recht
**editor** (inhoud bewerken) of **commenter**. Iedere actieve medewerker kan elk project zien.

## 3. Datamodel

Geïmplementeerd in fase A (✅) en ontworpen voor latere fasen (⏳). Bedragen altijd als gehele
GTA-dollars (`bigint`), nooit echt geld.

| Fase | Tabel / object                                 | Doel                                                                    |
| ---- | ---------------------------------------------- | ----------------------------------------------------------------------- |
| ✅ A | `staff_profiles`                               | Medewerker: naam, rol, actief                                           |
| ✅ A | `staff_invitations`                            | Enige weg naar een account; e-mail alleen voor admins zichtbaar         |
| ✅ A | `projects`                                     | Projectruimte per evenement; status-flow Idee → … → Gearchiveerd        |
| ✅ A | `project_members`                              | Editor/commenter per project                                            |
| ✅ A | `events`                                       | Publieke kant van een project (slug, tijden, capaciteit, inschrijfgeld) |
| ✅ A | `activity_log`                                 | Append-only audit, gevuld door triggers                                 |
| ✅ A | `private.rate_limits` + `consume_rate_limit()` | Duurzame rate limiting (gehashte sleutels)                              |
| ✅ B | `event_types`, `task_templates`                | Motorrace, rally, jetski … met standaardtaken                           |
| ✅ B | `tasks` (+ prioriteit, status, kanban-positie) | Taken met verantwoordelijke en deadline                                 |
| ✅ B | `project_checklist_items`, `runbook_items`     | Checklist en draaiboek                                                  |
| ✅ B | `threads`, `comments`                          | Discussies bij project, taak of idee                                    |
| ✅ B | `suggestions`                                  | Voorstel zonder directe wijziging; eigenaar accepteert/wijst af         |
| ✅ B | `content_revisions`                            | Versies van belangrijke inhoud, terugdraaien mogelijk                   |
| ✅ B | `team_activities` + view `calendar_items`      | Agenda als view over events/taken/deadlines: niets dubbel invoeren      |
| ✅ B | `ideas`, `idea_votes`                          | Ideeënbord; omzetten naar project behoudt discussies                    |
| ✅ B | Storage-bucket `project-files` (privé)         | Bijlagen en idee-afbeeldingen                                           |
| ✅ C | `map_routes`, `map_markers`, bucket `maps`     | Routes/markers per project, relatief aan de kaartafbeelding (0–1)       |
| ⏳ C | `participants`, `registrations`                | Inschrijving op genormaliseerde RP-naam; unieke actieve inschrijving    |
| ⏳ C | `register_for_event()`                         | Atomaire inschrijving: capaciteit + uniciteit in één transactie         |
| ⏳ C | `security_signals`                             | Minimale, kortlevende signalen voor verdachte inschrijvingen            |
| ⏳ D | `financial_entries` (+ views)                  | Grootboek: verwacht/ontvangen, correcties als nieuwe regels             |

## 4. Bouwvolgorde

| Fase | Inhoud                                                                                       |
| ---- | -------------------------------------------------------------------------------------------- |
| A    | Fundament: Next.js, design system, database + RLS, medewerkersauth, rechten, CI, previews    |
| B    | Dashboard, agenda, projecten, taken (kanban), discussies, suggesties, ideeënbord             |
| C    | GTA-kaart + route-editor, evenementbeheer, publieke pagina's, inschrijven, Turnstile, beheer |
| D    | CRM, financiële registratie, statistieken, rapportages, export                               |
| E    | Functionele, security- en mobiele tests, UX, performance, docs, productievoorbereiding       |

Elke fase wordt afgerond (migraties, autorisatie, UI en tests samen) voordat de volgende start.

## 5. Afhankelijkheden

Runtime: `next`, `react`, `@supabase/ssr`, `@supabase/supabase-js`, `zod`, shadcn/ui
(`@base-ui/react`, `class-variance-authority`, `cn`, `lucide-react`, `tw-animate-css`).
Later: `react-hook-form` (complexe formulieren, fase B), `recharts` (dashboard, fase B/D),
`leaflet` (kaart, fase C). Test: `vitest`, `@playwright/test`, Supabase CLI (pgTAP).

## 6. Obstakels en risico's

1. **GTA V-kaartmateriaal.** De kaart is auteursrechtelijk beschermd (Rockstar). De eigenaar heeft
   zelf een kaartafbeelding aangeleverd; die staat alleen in privé-opslag, is alleen zichtbaar voor
   ingelogde medewerkers en zit niet in de publieke repo (zie D29).
2. **Vercel Hobby is alleen voor niet-commercieel gebruik.** Geen echte betalingen, advertenties of
   betaalde ontwikkeling via de site. In-game GTA-geld is geen echte betaling. Donaties vragen mag.
3. **Supabase Free pauzeert een project na 1 week inactiviteit.** Bij regelmatig gebruik geen
   probleem; anders handmatig hervatten in het dashboard (data blijft bewaard).
4. **E-mail.** De standaard-mailserver van Supabase stuurt alleen naar teamleden van het
   Supabase-project, met een lage limiet. Uitnodigen en wachtwoordlinks via de Team-pagina werken
   zonder e-mail. Zelf "wachtwoord vergeten" via e-mail vraagt een (gratis) SMTP-dienst.
5. **Eén inschrijving per persoon is zonder geverifieerde identiteit niet te garanderen.** We
   beperken misbruik (Turnstile, rate limits, cookie, unieke naam per evenement, handmatige
   controle), maar claimen geen zekerheid.
6. **Publieke repository.** Iedereen kan de code lezen; geheimen staan uitsluitend in
   environment variables. Beveiliging mag nooit van geheimhouding van code afhangen.
