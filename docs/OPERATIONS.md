# Operations

## Runtime Requirements

- Docker 24+ with Docker Compose v2 (recommended), **or** Node.js 24 LTS with npm 11+
- An HTTPS reverse proxy in front of the app (Caddy, nginx, Traefik)
- Writable, persistent storage for `data/` (SQLite) and `uploads/` (attachments)

Node.js 20 is end-of-life and no longer supported.

## Configuration

Create the configuration from the template:

```bash
cp .env.example .env.local
```

| Group | Variables |
| --- | --- |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL` |
| Routing | `SB_EMAIL`, `EMAIL_SUBJECT_PREFIX` (per-employer recipients are set in the dashboard) |
| Access | `PUBLIC_PASSWORD`, `DASHBOARD_USER`, `DASHBOARD_PASSWORD` |
| Sessions | `SESSION_SECRET` (≥ 32 random chars: `openssl rand -hex 32`) |
| Files | `MAX_FILE_SIZE`, `UPLOAD_DIR`, `ALLOWED_FILE_TYPES`, `FILE_RETENTION_DAYS` |
| Misc | `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_SLOGAN`, `EMPLOYERS`, `ENABLE_DEBUG_DELETE_ALL` |

Values saved in the dashboard (global settings) are stored in the database and take precedence over environment variables.

## Docker Deployment

The `Dockerfile` builds a Next.js standalone image on `node:24-trixie-slim`:

- runs as unprivileged user `nextjs` (UID 1001), application files are read-only for it
- npm/corepack removed from the runtime image
- built-in healthcheck (`GET /api/public-settings`)
- volumes: `/app/data` (database), `/app/uploads` (attachments)

Both Compose files run the container with a read-only root filesystem, all capabilities dropped, `no-new-privileges`, an init process, and publish port 3000 only on `127.0.0.1`.

### Build and run on the server

```bash
cp .env.example .env.local      # fill in values
docker compose up -d --build
docker compose logs -f
```

### Prebuilt image / offline target host

```bash
# build machine
docker build -t blueotter-krankmelder:latest .
docker save blueotter-krankmelder:latest -o blueotter-krankmelder.tar

# target host (needs docker-compose.prod.yml and .env.local)
docker load -i blueotter-krankmelder.tar
docker compose -f docker-compose.prod.yml up -d
```

### Reverse proxy

In production the session cookie is `Secure`, so the admin login only works over HTTPS. The proxy must pass the original `Host` header (or `X-Forwarded-Host`); otherwise state-changing admin requests are rejected by the origin check. Minimal Caddy example:

```
krankmeldung.example.de {
    reverse_proxy 127.0.0.1:3000
}
```

### Updates

Rebuild regularly so that the latest Node.js 24 patch release and Debian security fixes are included:

```bash
git pull
docker compose build --pull
docker compose up -d
```

`docker compose down` keeps the data; `docker compose down -v` **deletes** the volumes with all reports and uploads.

### Native module approval

npm 11+ only runs install scripts approved in `allowScripts` (`package.json`). `better-sqlite3` is approved per version; after upgrading it run `npm install-scripts approve better-sqlite3` and commit the change.

`better-sqlite3` uses prebuilt binaries for linux x64/arm64. On other platforms add `python3 make g++` to the `deps` stage.

## Running without Docker

```bash
npm ci
npm run build
NODE_ENV=production npm run start      # or: node .next/standalone/server.js
```

Run it as a dedicated, unprivileged user under a process manager (systemd), behind an HTTPS proxy.

## Data Paths

| Data | Without Docker | Docker |
| --- | --- | --- |
| Database (+ WAL files) | `data/krankmeldungen.db` | volume `krankmelder-data` → `/app/data` |
| Uploads | `uploads/` | volume `krankmelder-uploads` → `/app/uploads` |

## Backup and Recovery

1. Back up database and uploads together (same point in time) so references stay consistent; for a consistent SQLite copy stop the container briefly or use `sqlite3 krankmeldungen.db ".backup backup.db"`.
2. Encrypt backups at rest and keep at least one offline copy.
3. Test restores regularly.

Restore: put back `data` and `uploads` from the same backup set, recreate `.env.local` from your secret store, start the app, verify login and a test submission.

## Dashboard Workflow

- New reports appear with status **Neu**.
- After processing, click **✓ Bearbeitet**; time and user are stored and logged. **↩ Neu** reverts this.
- Filter by status in the report list; the overview shows counts per status.

## Production Checklist

- [ ] HTTPS via reverse proxy, port 3000 not publicly reachable
- [ ] `SESSION_SECRET`, `DASHBOARD_PASSWORD`, `PUBLIC_PASSWORD` set to strong unique values
- [ ] SMTP credentials stored only in `.env.local` / dashboard
- [ ] `ENABLE_DEBUG_DELETE_ALL` unset
- [ ] Rate limiting / bot protection for the public submit endpoints at the proxy
- [ ] Regular image rebuilds (`docker compose build --pull`) and backups
- [ ] Central log collection for submit and mail failures
