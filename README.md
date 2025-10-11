# Fullstack App Blueprint
Secure monorepo blueprint for web (Next.js), mobile (Flutter), and API (NestJS) with OpenAPI contracts and SDKs for TS & Dart.

## Quickstart
1) docker compose -f infra/docker-compose.yml up -d
2) pnpm i
3) pnpm sdk:all
4) pnpm dev
(Flutter: cd apps/mobile && flutter run)

## CI Quickstart (no terminal)
Open **Actions → Stack Init (OpenAPI + SDKs) → Run workflow**.  
This will:
- install dependencies & run Prisma generate  
- emit OpenAPI & sync contracts  
- generate TS & Dart SDKs  
- upload artifacts you can download from the job
