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
