# Beslissingen

Korte vastlegging van belangrijke technische keuzes. Nieuwste onderaan.

## 2026-10-13 — Fase A

**D1. Alleen gratis diensten.** GitHub Free, Vercel Hobby, Supabase Free, Cloudflare Turnstile.
Rate limiting draait in Supabase Postgres in plaats van een aparte Redis-dienst: duurzaam over
serverless-instances heen en geen extra account of kosten.

**D2. Supabase alleen server-side.** Alle Supabase-aanroepen gebeuren in Server Components en
Server Actions. Daardoor staat er geen sleutel in de browser, is `connect-src 'self'` mogelijk en is
er één plek voor autorisatie. Env-variabelen hebben bewust géén `NEXT_PUBLIC_`-prefix.

**D3. Autorisatie in drie lagen.** Proxy (optimistische redirect) → DAL (`requireStaff`,
`requireRole`, per request met `connection()`) → RLS + kolomrechten + guard-triggers. Elke laag
alleen al blokkeert ongeautoriseerde toegang; tests bewijzen dit per laag (pgTAP en Playwright).

**D4. Uitnodigen zonder e-mail.** Admins krijgen een eenmalige link (`generateLink`) die ze privé
delen. Dat is gratis, heeft geen SMTP nodig en werkt meteen. De token wordt pas verbruikt na een klik
op "Doorgaan" (POST), zodat link-previews (Discord) en mailscanners hem niet ongeldig maken.

**D5. E-mailadressen alleen voor admins.** Staat in `staff_invitations` (admin-only RLS) en Auth;
gewone medewerkers zien alleen naam en rol van collega's. De audit-log bevat geen e-mail of vrije
tekst, alleen gewijzigde kolommen en kleine enum-waarden.

**D6. Deactiveren in plaats van verwijderen.** `is_active = false` ontneemt direct alle toegang
(RLS) en een Auth-ban blokkeert nieuwe logins. Niemand kan de eigen rol of status wijzigen, dus er
blijft altijd minstens één admin over.

**D7. Status en publicatie op één plek.** De projectstatus (Idee → … → Gepubliceerd → Afgerond →
Gearchiveerd / Geannuleerd) bepaalt ook de publieke zichtbaarheid; er is geen tweede "gepubliceerd"-
veld. Publiceren kan pas als het evenement een starttijd heeft (database-trigger). Alleen eigenaar
of admin wijzigt status en eigendom.

**D8. Anon krijgt in fase A niets.** Bezoekers zonder account (de rol `anon`) hebben geen
enkele tabel- of functierecht; een schema-brede test bewaakt dit. Publieke, gewhiteliste
leesfuncties komen in fase C en worden dan expliciet aan die test toegevoegd.

**D9. CSP zonder nonces.** Nonces dwingen elke pagina dynamisch te renderen (meer
serverbelasting, slechter voor het gratis plan). We gebruiken een statische CSP met
`'unsafe-inline'` voor scripts (vereist door Next.js zonder nonces), en blokkeren al het andere:
`frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`, `connect-src 'self'`. Tegen XSS
vertrouwen we op React-escaping zonder ruwe HTML. In fase E opnieuw bekijken.

**D10. Formulieren met Server Actions + Zod.** Auth-formulieren gebruiken `useActionState` en
server-side Zod-validatie. Ze werken ook zonder JavaScript en hebben weinig code. React Hook Form
komt erbij voor complexe, interactieve formulieren (fase B).

**D11. shadcn/ui (base-nova, Base UI).** Gekozen volgens de projectstack. Het `cn`-pakket is van
de shadcn-maintainer (gecontroleerd). Het thema mapt de Skyline-kleuren op shadcn-variabelen;
de app is altijd donker (`<html class="dark">`).

**D12. Next.js 16-conventies.** `proxy.ts` (voorheen middleware), Cache Components: publieke
pagina's zijn statisch, interne pagina's hebben een statische schil zonder data en streamen inhoud
na de sessiecontrole. Sessie-afhankelijke code staat achter `<Suspense>`.

**D13. Geen automatische productie-deploys.** `vercel.json` schakelt deploys vanaf `main` uit.
Pull requests krijgen Vercel-previews; productie gaat alleen live na expliciete toestemming.

**D14. MFA (TOTP) wordt ook in de database afgedwongen.** Basis-MFA (authenticator-app) zit in
Supabase Free; telefoon-MFA is betaald en wordt niet gebruikt. Voor wie MFA aanzet, geeft
`private.current_staff_role()` pas rechten bij een sessie met `aal2` (wachtwoord + code). Een
gestolen wachtwoord alleen levert dus ook via de API niets op. MFA blijft vrijwillig maar wordt sterk
aanbevolen; admins kunnen MFA van een ander resetten bij een verloren telefoon. Uitzetten vereist
een code-login van maximaal 15 minuten geleden; wachtwoord wijzigen vereist volledige authenticatie
(met code). MFA-wijzigingen en door admins gemaakte inloglinks komen in de activiteitenlog via
`log_security_event` (die zelf controleert wie wat mag vastleggen). We schrijven niet rechtstreeks in
Supabase's `auth`-schema; het gehoste platform kan dat beperken.

**D15. Lokale testlimieten.** In `supabase/config.toml` staan de Auth-limieten voor inloggen en
verificaties hoog, omdat alle e2e-logins via één IP (de app-server) lopen. Dit geldt alleen lokaal
en in CI; gehoste projecten houden de Supabase-standaard, met de eigen limieten van de app erbovenop.

## 2026-10-14 — Fase B

**D16. Eén projectruimte per evenement, aanmaken en bewerken atomair.** `create_event_project`
maakt project, evenement en standaardtaken in één transactie; `update_event_project` past project
en evenement samen aan. De evenementnaam volgt de projectnaam (één keer invoeren).

**D17. Geschiedenis en terugzetten via revisies.** Een trigger bewaart bij elke inhoudelijke
wijziging de vorige waarden (`content_revisions`). Terugzetten loopt via de normale rechten en
wordt zelf ook een revisie. Geaccepteerde suggesties komen zo ook in de geschiedenis.

**D18. Uitvoerders zonder bewerkrecht.** Een toegewezen medewerker mag alleen status en volgorde
van de eigen taak wijzigen en de checklist van die taak afvinken (guard-triggers + RLS).

**D19. Agenda afgeleid van bestaande data.** Starttijden van evenementen en deadlines van taken
komen rechtstreeks uit hun tabellen; alleen teamactiviteiten worden apart opgeslagen. Verplaatsen
schuift het einde mee. Alle dag- en periodegrenzen in Europe/Amsterdam (zomer/wintertijd-veilig).

**D20. Bestanden: privé, inert en via eigen domein.** Supabase Storage (privé bucket) met policies
op pad (`projects/<id>/`, `ideas/<id>/`). Type bepaald op inhoud (magic bytes; alleen PNG, JPEG,
WebP, GIF, PDF), max. 4 MB (Vercel-limiet 4,5 MB). Downloaden via `/intern/bestanden/<id>` na
sessiecontrole met een eigen, strikte sandbox-CSP; de browser praat nooit met Supabase.

**D21. Glijdend venster voor rate limiting.** Een vast venster liet aan de grens twee keer het
budget toe. `consume_rate_limit` telt nu het vorige venster naar rato mee.

**D22. Uitloggen als volledige paginalading.** Next.js 16 houdt bezochte pagina's verborgen in de
DOM (React Activity). Uitloggen is daarom een gewone POST met 303-redirect, plus Clear-Site-Data,
zodat er na uitloggen niets intern in de browser achterblijft.

**D23. Dashboard: cijfers in de database, één grafiek, geen nepkaarten.** `dashboard_summary`
rekent alles server-side in één aanroep (met RLS). Kaarten voor deelnames en geld verschijnen pas
als fase C/D die gegevens heeft. De grafiekkleur (#b38b35) is met de dataviz-validator getoetst
op het donkere oppervlak; elke grafiek heeft een tabelweergave.

**D24. Kanban met knoppen in plaats van slepen.** Verplaatsen met "Starten/Klaar/Heropenen" werkt
met toetsenbord en schermlezer en vraagt geen extra drag-and-drop-library.
