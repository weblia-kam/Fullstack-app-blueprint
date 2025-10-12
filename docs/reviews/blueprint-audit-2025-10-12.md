# Blueprint Audit – 2025-10-12

**Reviewer:** Codex AI  
**Scope:** Fullstack blueprint (NestJS + Next.js + Flutter)  
**Goal:** Evaluate 10/10 enterprise readiness  

| # | Kategori | Score | Kommentar |
|---|-----------|--------|------------|
| 1 | Arkitektur & struktur | 6 | Solid monorepo layout med delt turborepo, men flere moduler (bruker, kontrakter) er uferdige og mangler domenelag. |
| 2 | Sikkerhet (auth, tokens, secrets, CSRF, CORS, headers, rate-limit) | 4 | Godt sikkerhetsgrunnlag (Helmet, rate limiting), men kritiske mangler som hardkodet JWT-secret og usikre cookie-handoffs. |
| 3 | Datamodell & migrasjonsstrategi | 3 | Prisma-skjema uten migrasjoner, ingen historikk, svak strategi for dataeierskap og seeding. |
| 4 | Kodekvalitet / konvensjoner | 5 | Lesbar kode, men mangler konsistente abstraheringer (stubbet UserService, ingen DTO-er). |
| 5 | API-design / OpenAPI-kontrakter | 4 | Automatisert OpenAPI, men ingen versjonering, begrenset ressursdekning og DEV-lekkasjer i respons. |
| 6 | Test (E2E + unit) | 3 | Én skriptet E2E som dekker auth; ingen enhetstester eller kontraktstester. |
| 7 | Dev Experience / CI-pipeline | 6 | Workflow for SDK-generering og E2E finnes, men krever manuell trigging og mangler kvalitetssikring (lint/build) i CI. |
| 8 | Dokumentasjon & onboarding | 4 | Kort README og sparsomme docs; mangler dypere operasjonelle guider og sikkerhetspolicyer. |
| 9 | Skalerbarhet / deploy-klarhet | 4 | Docker-compose kun for lokale avhengigheter; ingen produksjonsklare deploy-manifester eller observability-plan. |
| 10 | DX / modularitet (gjenbruk) | 5 | Noe gjenbruk (SDKs, kontrakt-sync), men mangler modulgrenser, felles autentiseringsbibliotek og delte typer. |

## 1. Arkitektur & struktur
- 🔴 **Kritiske funn (må fikses før bruk)**
  - Ingen dedikert domenelag eller repository-abstraksjon; API- og webklienter kaller Prisma direkte, noe som vanskeliggjør cross-service policyer og auditing.【F:apps/api/src/modules/auth/auth.service.ts†L13-L110】【F:apps/web/app/profile/page.tsx†L3-L19】
- 🟠 **Alvorlige funn**
  - UsersService er en tom stub, noe som viser at sentrale moduler ikke er ferdigstilt og undergraver blueprintets fullstendighet.【F:apps/api/src/modules/users/users.service.ts†L1-L5】
- 🟡 **Moderate funn**
  - Nest-app initierer uten modulær CORS-konfigurasjon eller miljøsegmentering, slik at web og mobil må håndtere egne proxier.【F:apps/api/src/main.ts†L9-L24】
- 🟢 **Mindre funn / forbedringer**
  - God mappestruktur og turborepo-oppsett legger grunnlag for videre modulering.【F:turbo.json†L1-L9】
- 💡 **Forslag til forbedring**
  - Etabler et felles domenelag (services + repositories) og delte kontrakter for å sikre konsistent logikk mellom plattformer.

## 2. Sikkerhet (auth, tokens, secrets, CSRF, CORS, headers, rate-limit)
- 🔴 **Kritiske funn (må fikses før bruk)**
  - JWT bruker hardkodet default-secret (`dev-secret-change-me`) hvis miljøvariabel mangler, som kan misbrukes i produksjon.【F:apps/api/src/modules/auth/jwt.util.ts†L3-L18】
  - Magic-link callback kopierer cookies uten `secure`-flagg og ignorerer øvrige attributter, noe som eksponerer tokens på webdomenet.【F:apps/web/app/auth/callback/route.ts†L22-L33】
- 🟠 **Alvorlige funn**
  - CORS er deaktivert (origin: false), så enhver fremtidig åpning krever manuell hardening og tilpasset policy.【F:apps/api/src/main.ts†L9-L24】
  - Mobilklienten lagrer tokens i minnet uten kryptering, rotasjon eller fallback, og mangler refresh-flow – uakseptabelt på enterprise-nivå.【F:apps/mobile/lib/api/client.dart†L3-L90】
- 🟡 **Moderate funn**
  - Auth-controller returnerer dev-tokens og full JWT-respons i body, som bør fjernes eller begrenses i produksjon.【F:apps/api/src/modules/auth/auth.controller.ts†L23-L74】
  - Web-login POSTer direkte mot API uten CSRF-beskyttelse eller same-site strategi utover `lax`.【F:apps/web/app/(auth)/login/page.tsx†L13-L88】
- 🟢 **Mindre funn / forbedringer**
  - Helmet, rate-limiting og ValidationPipe gir et godt startnivå.【F:apps/api/src/main.ts†L12-L24】
- 💡 **Forslag til forbedring**
  - Gjør secrets obligatoriske via konfigmodul, implementer tokens som HttpOnly Secure cookies gjennom en reverse proxy, og innfør mobil Secure Storage.

## 3. Datamodell & migrasjonsstrategi
- 🔴 **Kritiske funn (må fikses før bruk)**
  - Ingen versjonerte migrasjoner; CI bruker `prisma db push`, noe som ikke er audit-sikkert og kan slette data ved schema-endringer.【F:.github/workflows/test-all.yml†L33-L41】
- 🟠 **Alvorlige funn**
  - Fravær av migrasjonskatalog gjør det umulig å spore endringer eller utføre rollback kontrollert.【F:packages/db/prisma/schema.prisma†L1-L51】
- 🟡 **Moderate funn**
  - Mangler auditfelt (updatedAt, createdBy) og forretningsnøkler for kritiske tabeller som Session og MagicLink.【F:packages/db/prisma/schema.prisma†L33-L50】
- 🟢 **Mindre funn / forbedringer**
  - Enkel indeks på navn kan gi søkestøtte, men bør suppleres med helhetlig modellering.【F:packages/db/prisma/schema.prisma†L8-L23】
- 💡 **Forslag til forbedring**
  - Etabler Prisma-migrasjoner med code review, legg til historikk-tabeller og seed-skript for test-/demo-data.

## 4. Kodekvalitet / konvensjoner
- 🔴 **Kritiske funn (må fikses før bruk)**
  - Ingen.
- 🟠 **Alvorlige funn**
  - DTO-validering er blandet (Zod i controller, class-validator ellers) og bør standardiseres for konsistens og generering.【F:apps/api/src/modules/auth/auth.controller.ts†L1-L74】
- 🟡 **Moderate funn**
  - Manglende feilhåndtering/logging rundt eksterne kall (Mailhog, Prisma) gjør drift vanskelig.【F:apps/api/src/modules/auth/auth.service.ts†L22-L110】
- 🟢 **Mindre funn / forbedringer**
  - Koden følger stort sett klare konvensjoner og er lett å lese.【F:apps/api/src/modules/health/health.controller.ts†L1-L9】
- 💡 **Forslag til forbedring**
  - Introduser en felles kodekonvensjon (ESLint, Nest CLI DTO-er) og logging/interceptor-lag for bedre observability.

## 5. API-design / OpenAPI-kontrakter
- 🔴 **Kritiske funn (må fikses før bruk)**
  - OpenAPI-generering er on-demand og skrevet til disk uten publiseringspipeline; manglende distribusjon kan føre til foreldede SDK-er.【F:apps/api/src/main.ts†L25-L38】【F:packages/contracts/scripts/sync-openapi.mjs†L1-L8】
- 🟠 **Alvorlige funn**
  - API eksponerer devToken i produksjonskontrakt, noe som bryter sikkerhetsprinsipper og SDK-kontrakter.【F:apps/api/src/modules/auth/auth.controller.ts†L23-L36】
- 🟡 **Moderate funn**
  - Ingen versjonering av endpoints eller schema; vanskelig å rulle ut breaking endringer.【F:apps/api/src/main.ts†L25-L33】
  - `/me` returnerer rå brukerobjekt uten HAL/JSON:API-standard eller filtrering via DTO.【F:apps/api/src/modules/users/users.controller.ts†L1-L29】
- 🟢 **Mindre funn / forbedringer**
  - Swagger + generator-skript gir grunnlag for kontraktstyrt utvikling.【F:package.json†L9-L21】
- 💡 **Forslag til forbedring**
  - Etabler CI for å publisere OpenAPI/SDK som artefakter, fjern dev-responser og innfør versjonert API (v1) med klare ressurskontrakter.

## 6. Test (E2E + unit)
- 🔴 **Kritiske funn (må fikses før bruk)**
  - Ingen automatiske tester utover en skriptet E2E; ingen guard mot regresjoner eller sikkerhetsbrudd.【F:scripts/e2e-auth.test.mjs†L1-L66】
- 🟠 **Alvorlige funn**
  - CI-workflows kjører ikke lint/build/test på push; kvalitet avhenger av manuell kjøring.【F:.github/workflows/stack-init.yml†L7-L66】
- 🟡 **Moderate funn**
  - Mangler kontraktstester mot OpenAPI og mocked integrasjonstester for kritiske flows.【F:package.json†L9-L21】
- 🟢 **Mindre funn / forbedringer**
  - E2E-skriptet dekker både magic link og passordflyt som sanity-check.【F:scripts/e2e-auth.test.mjs†L15-L64】
- 💡 **Forslag til forbedring**
  - Bygg ut Jest/Vitest-unit tester, Playwright for web, Flutter driver-tester, og trigge dem i CI på hver PR.

## 7. Dev Experience / CI-pipeline
- 🔴 **Kritiske funn (må fikses før bruk)**
  - Ingen.
- 🟠 **Alvorlige funn**
  - Workflows trigges manuelt; uten branch-beskyttelse og automatikk mister man enterprise guardrails.【F:.github/workflows/stack-init.yml†L1-L66】【F:.github/workflows/test-all.yml†L1-L54】
- 🟡 **Moderate funn**
  - CI mangler matrix for Node/Flutter-versjoner og caching, noe som gir treg opplevelse og ustabilitet.【F:.github/workflows/test-all.yml†L8-L54】
- 🟢 **Mindre funn / forbedringer**
  - pnpm + Turborepo script gir effektiv lokalutvikling.【F:package.json†L5-L21】
- 💡 **Forslag til forbedring**
  - Automatiser workflows på push/PR, legg inn lint/test/build-steg og publiser byggartefakter.

## 8. Dokumentasjon & onboarding
- 🔴 **Kritiske funn (må fikses før bruk)**
  - Ingen.
- 🟠 **Alvorlige funn**
  - Dokumentasjon beskriver ikke produksjonsdrift, hemmelighetshåndtering eller incident-respons, noe som er nødvendig for enterprise-klarhet.【F:README.md†L4-L41】【F:docs/SECURITY.md†L1-L1】
- 🟡 **Moderate funn**
  - ADR og arkitekturdokument er svært korte og gir ikke tilstrekkelig kontekst for beslutninger.【F:docs/ARCHITECTURE.md†L1-L1】【F:docs/ADRS/0001-stack.md†L1-L1】
- 🟢 **Mindre funn / forbedringer**
  - README forklarer grunnleggende oppsett og helsesjekker.【F:README.md†L4-L22】
- 💡 **Forslag til forbedring**
  - Utvid dokumentasjon med sekvensdiagrammer, sikkerhetspolicy, driftsrunbooks og onboarding-sjekklister.

## 9. Skalerbarhet / deploy-klarhet
- 🔴 **Kritiske funn (må fikses før bruk)**
  - Ingen.
- 🟠 **Alvorlige funn**
  - Mangler produksjonsklare infrastrukturdefinisjoner (Kubernetes/Terraform) og observability (metrics/logging tracing).【F:infra/docker-compose.yml†L1-L19】
- 🟡 **Moderate funn**
  - API mangler health/metrics utover enkel ping; ingen readiness/liveness hooks for orkestrering.【F:apps/api/src/modules/health/health.controller.ts†L1-L9】
- 🟢 **Mindre funn / forbedringer**
  - Docker Compose for Postgres og Mailhog støtter lokal kjøring.【F:infra/docker-compose.yml†L1-L19】
- 💡 **Forslag til forbedring**
  - Legg til prod-Dockerfiles, Helm/Compose for tjenester, metrics-endpoints og logging-standarder.

## 10. DX / modularitet (gjenbruk)
- 🔴 **Kritiske funn (må fikses før bruk)**
  - Ingen.
- 🟠 **Alvorlige funn**
  - Ingen felles auth-klient mellom web/mobil; hver implementasjon håndterer tokens manuelt og inkonsistent.【F:apps/web/app/(auth)/login/page.tsx†L13-L88】【F:apps/mobile/lib/api/client.dart†L26-L90】
- 🟡 **Moderate funn**
  - SDK-generering er satt opp, men uten publisering eller versjonering til pakke-repositorier.【F:package.json†L11-L21】
- 🟢 **Mindre funn / forbedringer**
  - Turborepo og pnpm workspace legger til rette for deling av pakker.【F:pnpm-workspace.yaml†L1-L9】
- 💡 **Forslag til forbedring**
  - Bygg felles auth/util-pakker, distribuer SDK-er via npm/pub og etabler modulære konfigpakker.

### 🧩 Totalvurdering
- **Samlet score:** 44 / 100  
- **Enterprise readiness:** ❌  
- **Oppsummering:** Blueprinten viser et godt startpunkt med struktur og grunnleggende sikkerhetsmekanismer, men mangler kritiske enterprise-krav som sikre secrets, migrasjonsstyring, helhetlig test-/CI-regime og fullverdige moduler.

### 🧾 10 / 10 Checklist
Liste over hva som mangler for å nå 10 / 10:
- [ ] Obligatoriske secrets, sikker cookie-håndtering og mobil secure storage på tvers av klienter.
- [ ] Versjonerte Prisma-migrasjoner, dataseed og rollback-strategi.
- [ ] Full CI/CD med automatiske lint/build/test og artefaktpublisering.
- [ ] Omfattende dokumentasjon (runbooks, sikkerhetspolicy, arkitekturdiagrammer) og ferdigstilt domenelag.
- [ ] Produksjonsklare deploy-manifester og observability (metrics/logging/tracing).
