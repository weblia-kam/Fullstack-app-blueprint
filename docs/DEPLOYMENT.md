# Deployment Guide

This document describes how to build, run, and deploy the Blueprint application stack using the production-ready Docker images, Compose bundle, and Helm chart included in this repository.

## Prerequisites

- Docker Engine 24+
- Docker Compose v2
- (Optional) kubectl + Helm 3 for Kubernetes deployment
- Access to the necessary secrets (see [Environment variables](#environment-variables))

## Build and run locally with Docker Compose

Use the production compose file to build the hardened images and start the stack locally:

```bash
docker compose --env-file .env.prod.example -f infra/docker-compose.prod.yml up --build
```

The compose file builds images using the multi-stage Dockerfiles in `apps/api` and `apps/web`, applies health checks, and starts a Traefik reverse proxy.

### Port mapping

| Service | Local port |
| ------- | ---------- |
| API     | 3000       |
| Web     | 3001       |
| Proxy (Traefik) | 80 / 443 |

The proxy forwards HTTPS requests to the web container and exposes the API under `http://localhost/api/` by default (see `infra/docker-compose.prod.yml`).

## Environment variables

Copy `.env.prod.example` to `.env.prod` (or any filename of your choice) and provide real values before starting the stack. These variables are loaded by the API and web services:

- `DATABASE_URL` – Connection string for the production database.
- `JWT_SECRET`, `COOKIE_SECRET`, `ENCRYPTION_KEY` – Required cryptographic secrets.
- `API_CORS_ORIGINS` – Comma-separated list of allowed origins for API CORS.

## Enabling TLS with Traefik

Traefik is configured with HTTP (80) and HTTPS (443) entrypoints. To enable TLS locally:

1. Provide certificates via a mounted volume, for example:
   ```yaml
   proxy:
     volumes:
       - ./infra/certs:/certs:ro
     command:
       - "--entrypoints.websecure.address=:443"
       - "--providers.file.filename=/certs/traefik.yml"
   ```
2. Create `infra/certs/traefik.yml` that points to your certificate and key using Traefik's [TLS configuration](https://doc.traefik.io/traefik/https/tls/).
3. Restart the compose stack so Traefik picks up the configuration.

For production, integrate with Traefik's ACME support or your certificate management solution.

## Building and pushing images

The repository includes GitHub Actions workflow `.github/workflows/build-images.yml` that authenticates to Docker Hub and publishes the `api` and `web` images. Provide `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` in the repository secrets, then trigger the workflow via a release tag (`v*.*.*`) or manually using the **Run workflow** button.

To build and push locally:

```bash
docker build -f apps/api/Dockerfile -t your-registry/blueprint-api:latest .
docker push your-registry/blueprint-api:latest
```

Repeat the same for the web image using `apps/web/Dockerfile`.

## Deploying with Helm

A starter Helm chart is provided in `charts/blueprint`. To install into a Kubernetes cluster:

```bash
helm upgrade --install blueprint charts/blueprint \
  --set image.api=your-registry/blueprint-api:latest \
  --set image.web=your-registry/blueprint-web:latest \
  --set env.API.JWT_SECRET="..." \
  --set env.API.COOKIE_SECRET="..." \
  --set env.API.ENCRYPTION_KEY="..."
```

The chart creates separate deployments and services for the API and web components with hardened security contexts (non-root user, read-only root filesystem, dropped capabilities, and disabled privilege escalation). The included ingress template demonstrates how to expose both services via a single host.

Review and extend the values in `charts/blueprint/values.yaml` for production (e.g., replicas, resources, ingress hostnames, TLS secrets).

## Operational recommendations

- Push images to a private container registry as part of your CI pipeline.
- Configure Traefik (or your ingress controller) with real TLS certificates in staging/production.
- Rotate secrets regularly and manage them via your secret management solution.
- Monitor container health using the built-in Docker and Kubernetes health probes.
- Keep dependencies updated and rebuild images frequently to pick up security patches.
