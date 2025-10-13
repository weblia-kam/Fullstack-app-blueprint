# Deployment

## Prod Simulation
1. Copy `.env.prod.example` → `.env.prod` and set secrets.
2. Run stack: `docker compose -f infra/docker-compose.prod.yml --env-file .env.prod up -d`.
3. Wait for Traefik dashboard at `https://traefik.localhost` (self-signed TLS).
4. Verify API health at `https://api.localhost/health` and web at `https://app.localhost/api/health`.

## Environment Variables
- Reference `.env.prod.example` for the minimal set.
- Load into platform secret manager before CI/CD deploys.
- Keep dev/test secrets separate from prod-simulation.

## Networking
- Traefik terminates TLS (self-signed certificates). Override certs by mounting files under `infra/certs`.
- Default ports: 443 (HTTPS), 80 (HTTP redirect), MailHog 8025, Postgres 5432.
- Healthchecks defined in `infra/docker-compose.prod.yml` for API (`/health`) and web (`/api/health`).

## Registry Push
- CI workflow `Docker Publish` builds images and pushes to the configured registry (`REGISTRY_HOST/PROJECT/*`).
- Local manual push: `docker compose -f infra/docker-compose.prod.yml build` → `docker push <tag>`.
- Tag images with commit SHA for traceability.
