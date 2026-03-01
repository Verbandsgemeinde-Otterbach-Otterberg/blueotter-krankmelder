# Architecture

## Purpose

BlueOtter Krankmelder provides structured sickness reporting workflows for municipal teams, with a public reporting interface and an administrative control plane.

## High-Level Components

- `app/page.tsx`: entrypoint for flow selection and user-facing forms.
- `app/components/*`: flow components (`SimpleForm`, `AUScanForm`, `ChildcareForm`, `EAUForm`) and shared UI.
- `app/dashboard/page.tsx`: admin interface for configuration and operations.
- `app/api/**/route.ts`: server API routes for submissions, configuration, auth, and diagnostics.
- `app/lib/db.ts`: SQLite initialization and schema migration helpers.
- `app/lib/email.ts`: SMTP transport and outbound notification logic.
- `app/lib/file-upload.ts`: upload validation and file persistence.

## Data Flow Overview

1. User opens public page and selects a reporting flow.
2. Form data is submitted to one of the submit endpoints:
   - `POST /api/submit-simple`
   - `POST /api/submit-auscan`
   - `POST /api/submit-childcare`
   - `POST /api/submit-eau`
3. Server validates payload and optional files.
4. Server reads routing and global settings from SQLite tables.
5. Notification email(s) are sent via SMTP.
6. Operational records are written to SQLite tables (`submissions`, `audit_log`, related config tables).

## API Surface (Current)

Public-facing and workflow endpoints:

- `POST /api/submit-simple`
- `POST /api/submit-auscan`
- `POST /api/submit-childcare`
- `POST /api/submit-eau`
- `GET /api/config/employers`
- `POST /api/auth/validate`
- `POST /api/auth/validate-token`
- `POST /api/auth/request-password`

Administrative endpoints:

- `GET/POST /api/employers`
- `POST /api/employers/order`
- `GET/POST /api/employer-settings`
- `GET/POST /api/global-settings`
- `GET/POST /api/cms/content`
- `GET /api/submissions`
- `GET /api/submissions/today`
- `GET /api/submissions/stats`
- `GET /api/submissions/employers`
- `GET /api/submissions/archive`
- `GET /api/submissions/[id]`
- `GET /api/submissions/[id]/pdf`
- `GET/POST /api/feedback`

Debug endpoints (restrict in production):

- `POST /api/debug/delete-all`
- `GET /api/debug/emails`
- `GET /api/debug/submission-emails`

## Persistence Model

SQLite database file is created under `data/krankmeldungen.db` (runtime local state, not versioned).

Important tables:

- `submissions`
- `au_scans`
- `audit_log`
- `employer_settings`
- `global_settings`
- `employers`
- `feedback`
- `cms_content`

`db.ts` includes lightweight schema evolution logic to add newly introduced columns on startup.

## Boundary Decisions

- No public API contract changes are part of this publication step.
- Documentation describes current behavior only.
- Sensitive operational content is kept out of source control via `.gitignore`.
