# BlueOtter Krankmelder

Web application for structured sickness reporting in municipal operations.

## Executive Summary (DE)

Der BlueOtter Krankmelder digitalisiert Krankmeldungen in einem klaren, nachvollziehbaren Ablauf fuer oeffentliche Einrichtungen.  
Der Fokus liegt auf sicherem Betrieb, wartbarer Architektur und praktikablen Verwaltungsprozessen.

## Executive Summary (EN)

BlueOtter Krankmelder is a municipal workflow app for secure and reliable sickness reporting.  
The project emphasizes operational clarity, maintainable engineering, and privacy-aware processing.

## Core Features

- Three reporting flows: simple sickness report, report with AU upload, childcare-related report.
- Admin dashboard for employer management, routing rules, and global settings.
- Configurable SMTP dispatch and recipient logic.
- SQLite-backed operational configuration and reporting metadata.
- CMS-like content endpoints for managed text content.

## Architecture Snapshot

- Frontend and API: Next.js App Router (TypeScript, React).
- Styling: Tailwind CSS.
- Persistence: SQLite via `better-sqlite3`.
- Mail delivery: Nodemailer over SMTP.
- File handling: validated uploads for AU-related forms.

Detailed docs:

- [Architecture](docs/ARCHITECTURE.md)
- [Operations](docs/OPERATIONS.md)
- [Security](docs/SECURITY.md)

## Local Setup

Prerequisites:

- Node.js 20+
- npm 10+

Install and run:

```bash
npm install
npm run dev
```

Production build check:

```bash
npm run build
```

App default URL: `http://localhost:3000`

## Configuration

1. Copy the template:
```bash
cp .env.example .env.local
```
2. Fill SMTP, routing, and password values for your environment.
3. Keep secrets local. Do not commit `.env.local` or runtime data directories.

Reference file: `.env.example`

## Docker Setup

For containerized deployment the repository ships a multi-stage `Dockerfile` and two Compose files. The image runs the Next.js standalone server as a non-root user with persistent volumes for the SQLite database and uploaded files.

Prerequisites:

- Docker 24+
- Docker Compose v2 (`docker compose` plugin)
- A populated `.env.local` (see [Configuration](#configuration))

### Quick start (local build)

Build the image from source and start the container:

```bash
docker compose up --build
```

The app is available at `http://localhost:3000`. Data and uploads are persisted in the named volumes `krankmelder-data` and `krankmelder-uploads` and survive container restarts.

Stop and remove the container (volumes are kept):

```bash
docker compose down
```

### Production-style run

`docker-compose.prod.yml` expects a prebuilt image (`pull_policy: never`) and adds an HTTP healthcheck against `http://127.0.0.1:3000/`. Typical workflow:

```bash
docker build -t blueotter-krankmelder:latest .
docker compose -f docker-compose.prod.yml up -d
```

To move the image to an offline target host, export and import it:

```bash
# on the build machine:
docker save blueotter-krankmelder:latest -o blueotter-krankmelder.tar

# on the target host:
docker load -i blueotter-krankmelder.tar
docker compose -f docker-compose.prod.yml up -d
```

### Notes

- `.env.local` is read at container start via `env_file` and is excluded from the image by `.dockerignore`, so secrets never end up baked into the image.
- `next.config.ts` enables `output: "standalone"` and force-includes `better-sqlite3` in the file trace. This produces a slim runtime image and ensures the native SQLite bindings are present.
- The container runs as a non-root user (`nextjs:nodejs`, UID 1001) and uses `tini` as PID 1 for proper signal handling.
- `docker compose down -v` removes the named volumes and therefore drops all persisted reports and uploads. Run this only if you intentionally want a clean slate.

## Data and Security Notes

- This repository is prepared for code-first publishing.
- Runtime data such as uploads, SQLite data files, and local environment secrets are excluded from version control.
- Do not place productive personal data in repository-tracked files.

## Project Scope

In scope:

- Municipal reporting workflows and supporting admin operations.
- Practical, secure, and maintainable software delivery for public-sector teams.

Out of scope:

- External HR/legal systems integration not implemented in this repository.
- Policy/legal interpretation beyond technical implementation guidance.

## Author

Maintained by Dominik Troester, Digitalbeauftragter at Verbandsgemeinde Otterbach-Otterberg.
