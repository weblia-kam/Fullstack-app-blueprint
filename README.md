# Fullstack-app-blueprint
Secure monorepo blueprint for web and mobile applications – built with **NestJS**, **Next.js (React)**, and **Flutter**, using **OpenAPI contracts** and **enterprise-grade architecture**.

## 🧱 Tech Stack
- **Backend:** NestJS (TypeScript) + Prisma + Postgres  
- **Frontend (Web):** Next.js (React)  
- **Mobile:** Flutter (Dart)  
- **Contracts:** OpenAPI → generated SDKs for TypeScript and Dart  
- **Infra:** pnpm + turborepo + Docker (Postgres, Mailhog)  

## 🚀 Quickstart
```bash
pnpm install
docker compose up -d
pnpm sdk:all
pnpm dev
# Flutter:
cd apps/mobile && flutter run
