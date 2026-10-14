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

## Online omgeving

Deel nooit sleutels in de chat. Ze staan alleen in de dashboards/CLI's van Supabase en Vercel, of
lokaal in een bestand dat git negeert (bij voorkeur buiten de repo).

### Opzet

- **Supabase**: één project, `skyline-entertainment` (ref `rjgizkedtrmaezvnlbis`, Free). Supabase
  Free staat twee actieve projecten toe en het andere is DPPS (nooit aanraken), dus dit is de enige
  online database en die is **productie**. De productie-instellingen staan in
  [`supabase/config.toml`](../supabase/config.toml) onder `[remotes.production]`.
- **Vercel**: project `skylineentertainment` (Hobby, niet-commercieel), productie op
  <https://skylineentertainment.vercel.app>. Previews van pull requests hebben bewust géén
  backend-variabelen: publieke pagina's werken, interne pagina's geven 503.
- **Productie-deploys** gaan nooit automatisch (`vercel.json` zet Git-deploys vanaf `main` uit).

### Release naar productie (alleen na akkoord van de eigenaar)

Vereist: ingelogd met `npx supabase login` en `npx vercel login` (doet de eigenaar zelf).

1. **Migraties**: `npx supabase db push --dry-run`, controleren, dan `npx supabase db push`.
2. **Auth-instellingen**: `npx supabase config diff --project-ref rjgizkedtrmaezvnlbis`. Supabase
   Free met de standaard e-mailprovider weigert eigen e-mailtemplates (en dan de hele auth-update).
   Push daarom een kopie van de config zónder `[auth.email.template.recovery]`:
   ```bash
   mkdir -p /tmp/prodcfg/supabase
   awk 'BEGIN{s=0} /^[auth.email.template.recovery]/{s=1;next} /^[/{s=0} !s'      supabase/config.toml > /tmp/prodcfg/supabase/config.toml
   npx supabase config push --workdir /tmp/prodcfg --project-ref rjgizkedtrmaezvnlbis
   ```
   Daarna toont `config diff` alleen nog het onderwerp van dat template als verschil (verwacht).
3. **Vercel-variabelen** (alleen _Production_, één keer of bij rotatie): `SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `RATE_LIMIT_SECRET` (willekeurig, min. 32
   tekens) en `SITE_URL=https://skylineentertainment.vercel.app`. Sleutels gaan CLI-naar-CLI
   (`npx supabase projects api-keys --reveal` → `npx vercel env add NAAM production --sensitive`
   via stdin), nooit via de chat of een commit.
4. **Deploy** vanuit een schone export van `main` (geen lokale of genegeerde bestanden mee):
   ```bash
   git archive main | tar -x -C <lege map>
   cd <lege map> && npx vercel link --yes --project skylineentertainment && npx vercel deploy --prod --yes
   ```
5. **Kaartafbeelding** (eenmalig of bij vervanging; staat lokaal in `private/maps/`):
   `node --env-file=<bestand met SUPABASE_URL en SUPABASE_SECRET_KEY> scripts/upload-map.mjs <afbeelding>`.
   Lokaal: `npm run map:upload -- private/maps/gta-v-kaart-transparant.png`.
6. **Livetest**: één tijdelijke Administrator doorloopt alle modules en wordt daarna met alles wat
   hij maakte verwijderd (de auditlog bewaart dat de test plaatsvond):
   ```bash
   LIVE_BASE_URL=https://skylineentertainment.vercel.app LIVE_ENV_FILE=<bestand met SUPABASE_URL,
   SUPABASE_PUBLISHABLE_KEY en SUPABASE_SECRET_KEY> npx playwright test -c playwright.live.config.ts
   ```

### Administrator-account

```bash
node --env-file=<bestand met SUPABASE_URL, SUPABASE_SECRET_KEY, SITE_URL> scripts/create-admin.mjs   --email zuiderveenandrew@gmail.com --name Daniel
```

Print een eenmalige link (1 uur geldig) om het wachtwoord in te stellen. Voor een bestaand account
maakt hetzelfde commando een nieuwe link (bijv. als de enige Administrator het wachtwoord kwijt is).

### E-mail ("wachtwoord vergeten")

Zonder eigen SMTP stuurt Supabase alleen naar leden van de Supabase-organisatie, dus niet naar
medewerkers. Administrators maken daarom een inloglink via **Team**. Wil je later zelfbediening via
e-mail: koppel een gratis SMTP-dienst onder **Authentication → Emails → SMTP Settings**, met als
afzender uitsluitend **zuiderveenandrew@gmail.com** (nooit een privéadres), en zet dan ook het
template uit [`supabase/templates/recovery.html`](../supabase/templates/recovery.html).
