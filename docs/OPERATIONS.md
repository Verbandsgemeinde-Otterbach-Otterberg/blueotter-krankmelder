# Operations

## Runtime Requirements

- Node.js 24 LTS (see `.nvmrc`)
- npm 11+
- Writable local directories for runtime:
  - `data/`
  - `uploads/`

## Environment Configuration

Use `.env.example` as the baseline contract.  
Create local config:

```bash
cp .env.example .env.local
```

Minimum operational groups:

- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`
- Routing: `SB_EMAIL`, optional employer-level overrides
- Access control: `PUBLIC_PASSWORD`, `DASHBOARD_USER`, `DASHBOARD_PASSWORD`
- Storage: `DATABASE_URL`, `UPLOAD_DIR`

## Docker Deployment (recommended)

The image (`Dockerfile`) uses Node.js 24 LTS on Debian trixie-slim, runs as the unprivileged `node` user, ships without npm and serves the Next.js standalone build. SQLite data lives in `/app/data`, uploads in `/app/uploads` (both volumes).

```bash
cp .env.example .env        # fill in values, set a random SESSION_SECRET (openssl rand -hex 32)
docker compose up -d --build
docker compose logs -f
```

`docker-compose.yml` runs the container read-only with all capabilities dropped and `no-new-privileges`, and binds port 3000 only to `127.0.0.1`.

Requirements and notes:

- Run it behind a TLS reverse proxy (nginx, Caddy, Traefik). In production the session cookie is `Secure`, so the admin login only works over HTTPS. The proxy must forward the original `Host` header (or `X-Forwarded-Host`).
- Security updates: rebuild regularly so the latest Node.js 24 patch release and Debian fixes are picked up:
  ```bash
  docker compose build --pull && docker compose up -d
  ```
- Backup: back up the `data` and `uploads` volumes.
- Native module approval: npm 11+ only runs install scripts listed in `allowScripts` in `package.json`. After upgrading `better-sqlite3`, approve the new version with `npm install-scripts approve better-sqlite3`.

## Start Commands

Development:

```bash
npm run dev
```

Build validation:

```bash
npm run build
```

Production run (after build):

```bash
npm run start
```

## Operational Data Paths

- Database: `data/krankmeldungen.db` (+ WAL side files)
- Upload artifacts: `uploads/`

These are local runtime assets and intentionally excluded from Git.

## Backups and Recovery Basics

Recommended baseline:

1. Stop write-heavy activity before backup windows (or use consistent snapshot tooling).
2. Backup `data/` and `uploads/` together to keep references consistent.
3. Encrypt backups at rest.
4. Store at least one offline or immutable backup copy.
5. Test restoration regularly in a non-production environment.

Recovery outline:

1. Restore `data/` and `uploads/` from the same backup set.
2. Recreate `.env.local` from your secrets store.
3. Start application and verify dashboard and submit flows.

## Production Hardening Checklist

- Enforce HTTPS at ingress/load balancer.
- Restrict debug endpoints in production deployments.
- Rotate SMTP and admin credentials periodically.
- Apply least-privilege filesystem permissions to runtime directories.
- Add central log collection and alerting for submit/mail failures.
