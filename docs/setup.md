# Setup

## Lokaal ontwikkelen

Vereist: Node.js 24, Docker Desktop (aan).

```bash
npm install
npm run db:start            # lokale Supabase in Docker (migraties worden toegepast)
cp .env.example .env.local  # vul in met de waarden uit: npx supabase status -o env
npm run dev                 # http://localhost:3000
npm run admin:create -- --email jij@voorbeeld.nl --name "Jouw naam"   # eerste admin + link
```

Lokale e-mails (wachtwoordherstel) zie je in Mailpit: http://127.0.0.1:54324.

| Commando           | Doel                                                     |
| ------------------ | -------------------------------------------------------- |
| `npm run check`    | Prettier, ESLint, TypeScript en unit-tests               |
| `npm run test:db`  | pgTAP-tests voor RLS en database-regels                  |
| `npm run test:e2e` | Playwright (bouwt de app en test tegen lokale Supabase)  |
| `npm run db:reset` | Lokale database leegmaken en migraties opnieuw toepassen |
| `npm run db:types` | TypeScript-types opnieuw genereren na een migratie       |

## Online omgevingen (eenmalig, door de eigenaar)

Deel nooit sleutels in de chat. Zet ze alleen in de dashboards van Supabase en Vercel, of lokaal in
een bestand dat git negeert.

### 1. Supabase-project voor previews

1. Ga naar [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
   Naam `skyline-preview`, regio **Central EU (Frankfurt)**, plan **Free**. Bewaar het
   databasewachtwoord in je wachtwoordmanager.
2. **Authentication → Sign In / Providers**
   - _Allow new users to sign up_: **uit** (alleen uitnodigingen).
   - _Email_: **aan**.
3. **Authentication → Providers → Email** (of _Auth settings_, afhankelijk van de dashboardversie)
   - _Minimum password length_: **12**, _Password requirements_: **Letters and digits**.
   - _Secure password change_: **aan**.
4. **Authentication → URL Configuration**
   - _Site URL_: de preview-URL van Vercel (stap 2), bijv. `https://skyline-entertainment-git-…vercel.app`.
   - _Redirect URLs_: `https://*-daniel2000dk.vercel.app/**` (pas de teamnaam aan aan je Vercel-URL's).
5. **Authentication → Emails → Templates → Reset password**: onderwerp en inhoud uit
   [`supabase/templates/recovery.html`](../supabase/templates/recovery.html) plakken.
6. **Authentication → Multi-Factor**: _TOTP (App Authenticator)_ **aan** (gratis). Laat telefoon-MFA
   uit (betaald).
7. Database-migraties toepassen (vanuit deze map, in een terminal):
   ```bash
   npx supabase login                         # opent je browser
   npx supabase link --project-ref <ref>      # <ref> staat in de project-URL; vraagt het DB-wachtwoord
   npx supabase db push                       # past supabase/migrations/* toe
   ```

### 2. Vercel-project

1. [vercel.com/new](https://vercel.com/new) → **Import** `Daniel2000dk/Skyline-entertainment`
   (plan Hobby). Framework wordt automatisch herkend.
2. **Settings → Environment Variables**, alleen voor **Preview**:
   | Naam                       | Waarde                                                   |
   | -------------------------- | -------------------------------------------------------- |
   | `SUPABASE_URL`             | Supabase → Project Settings → API → Project URL          |
   | `SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → publishable key |
   | `SUPABASE_SECRET_KEY`      | Supabase → Project Settings → API Keys → secret key      |
   | `RATE_LIMIT_SECRET`        | Willekeurig, min. 32 tekens (`openssl rand -base64 32`)  |
3. Laat **Deployment Protection** op de standaard staan: previews zijn dan alleen zichtbaar voor
   ingelogde Vercel-teamleden.
4. Productie staat bewust uit: `vercel.json` voorkomt automatische deploys vanaf `main`. De eerste
   import kan de huidige `main` proberen te deployen; dat is onschadelijk.

### 3. Eerste Administrator op de preview

Maak lokaal een bestand `.env.bootstrap` (wordt door git genegeerd):

```bash
SUPABASE_URL=...            # van het preview-project
SUPABASE_SECRET_KEY=...     # van het preview-project
SITE_URL=https://...        # de preview-URL
```

```bash
node --env-file=.env.bootstrap scripts/create-admin.mjs --email jij@voorbeeld.nl --name "Jouw naam"
```

Open de geprinte link (1 uur geldig) en stel je wachtwoord in. Verwijder daarna `.env.bootstrap`.

### 4. Optioneel: e-mail voor "wachtwoord vergeten"

Zonder eigen SMTP stuurt Supabase alleen naar teamleden van het Supabase-project. Administrators
kunnen altijd een nieuwe inloglink maken via **Team**. Wil je zelfbediening via e-mail, koppel
dan een gratis SMTP-dienst onder **Authentication → Emails → SMTP Settings** (vraag eerst na of
een dienst creditcardgegevens eist).

### 5. Productie (pas na jouw akkoord)

Tweede Supabase-project `skyline-production` (zelfde stappen), Production-variabelen in Vercel,
en een bewuste eerste productie-deploy. Dit gebeurt pas na je expliciete toestemming.
