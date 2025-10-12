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

## Health & Tests
- API health: `GET /health`
- Web health: `/api/health`
- Run **Actions → Test All (E2E) → Run workflow** to verify the auth flow end-to-end.

## Dev login
- Open **MailHog** at `http://localhost:8025`
- Use `/login` to request a magic link → click the link in MailHog → you’re redirected to `/profile`.

## Authentication
- Primary: **Email/Password** (`POST /auth/login`, `POST /auth/register`)
- Alternative: **Email magic link** (`POST /auth/request-magic-link` → `POST /auth/verify-magic-link`)
Both issue the same JWT access/refresh tokens with rotation and JTI blacklist.

## Registration (Web)
Route: `/register`  
Fields: firstName, lastName, email, phone, birthDate, password, acceptedTerms  
→ calls `POST /auth/register`, redirects to `/profile`
