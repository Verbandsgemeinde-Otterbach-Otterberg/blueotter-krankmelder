# BlueOtter Krankmelder

Web application for structured sickness reporting in municipal operations.

> **Hinweis / Note:** Der Krankmelder ist jetzt auch als vollintegriertes, abschaltbares Modul „BlueOtter Krankmelder“ im Verwaltungsportal [jitsii-speechmind](https://github.com/derdigitalaffine/jitsii-speechmind) verfügbar – mit Portal-Konten und -Rechten, Zuständigkeit je Arbeitgeber, verschlüsselter Speicherung, Statusseite, eAU-Abruf-Status, optionaler eigener Domain und Import der Daten dieser Anwendung (ZIP mit `data/krankmeldungen.db` und `uploads/`). Details: Admin-Handbuch des Portals, Abschnitt „BlueOtter Krankmelder“.
> The sickness reporting workflow is now also available as an integrated, switchable module of the [jitsii-speechmind](https://github.com/derdigitalaffine/jitsii-speechmind) portal, including an importer for data from this application.

## Executive Summary (DE)

Der BlueOtter Krankmelder digitalisiert Krankmeldungen in einem klaren, nachvollziehbaren Ablauf für öffentliche Einrichtungen.
Beschäftigte melden sich über ein Webformular krank, die Personalverwaltung erhält die Meldung per E-Mail und bearbeitet sie im geschützten Dashboard.

## Executive Summary (EN)

BlueOtter Krankmelder is a municipal workflow app for secure and reliable sickness reporting.
Employees submit reports through a web form; HR receives them by email and processes them in a protected admin dashboard.

## Core Features

- Four reporting flows: simple report (without AU), report with AU upload, eAU information, child sick leave.
- Email notification to the responsible clerks (routing per employer) and optional confirmation to the employee.
- PDF generation per report; the submitter can download it once via a short-lived link.
- Admin dashboard: overview and statistics, report list with filters, CSV export, processing status (**Neu** / **Bearbeitet**), employer management, email routing, global settings, editable instructions page.
- SQLite storage, no external database needed.

## Tech Stack

- Next.js 16 (App Router, TypeScript, React 19), Tailwind CSS 4
- SQLite via `better-sqlite3`
- Nodemailer (SMTP), jsPDF
- Node.js 24 LTS, Docker

## Documentation

- [Architecture](docs/ARCHITECTURE.md) – components, data flow, API, data model
- [Operations](docs/OPERATIONS.md) – configuration, Docker deployment, updates, backups
- [Security](docs/SECURITY.md) – authentication, protections, hardening checklist

## Quick Start (Docker, recommended)

Requirements: Docker 24+ with Docker Compose v2, an HTTPS reverse proxy for production.

```bash
cp .env.example .env.local      # fill in SMTP, passwords and SESSION_SECRET
docker compose up -d --build
```

The app listens on `127.0.0.1:3000`. Put a TLS reverse proxy (Caddy, nginx, Traefik) in front of it: the admin login only works over HTTPS in production. Details, offline deployment and update routine: [Operations](docs/OPERATIONS.md#docker-deployment).

## Local Development

Requirements: Node.js 24 LTS (see `.nvmrc`), npm 11+.

```bash
cp .env.example .env.local
npm install
npm run dev          # http://localhost:3000
npm run build        # production build check
```

- Public forms: `/`
- Admin dashboard: `/dashboard` (credentials `DASHBOARD_USER` / `DASHBOARD_PASSWORD`)

## Configuration

All settings are environment variables; see `.env.example`. Most of them can later be changed in the dashboard (stored in the database, which takes precedence over the environment). The most important ones:

| Variable | Purpose |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL` | Outgoing mail |
| `SB_EMAIL` | Default recipient (HR) |
| `DASHBOARD_USER`, `DASHBOARD_PASSWORD` | Admin login |
| `PUBLIC_PASSWORD` | Password for the public forms |
| `SESSION_SECRET` | Signing key for admin sessions (≥ 32 random chars, `openssl rand -hex 32`) |
| `EMPLOYERS` | Initial employer list (JSON array) |

Never commit `.env.local` or runtime data (`data/`, `uploads/`).

## Project Scope

In scope: municipal reporting workflows and supporting admin operations.
Out of scope: integration with external HR/payroll systems, legal interpretation.

## Author

Maintained by Dominik Troester, Digitalbeauftragter at Verbandsgemeinde Otterbach-Otterberg.
