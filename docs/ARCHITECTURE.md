# Architecture

## Purpose

BlueOtter Krankmelder provides structured sickness reporting workflows for municipal teams: a public reporting interface for employees and a protected administrative dashboard for HR.

## Components

| Path | Responsibility |
| --- | --- |
| `app/page.tsx` | Public entry point, flow selection (behind the public password gate) |
| `app/components/*Form.tsx` | Reporting flows: `SimpleForm`, `AUScanForm`, `EAUForm`, `ChildcareForm` |
| `app/components/PasswordGate.tsx` | Login UI for public area and dashboard |
| `app/success/page.tsx` | Confirmation page with one-time PDF download |
| `app/instructions`, `app/staff-instructions` | Help pages (instructions are editable via the CMS) |
| `app/dashboard/page.tsx` | Admin dashboard |
| `app/api/**/route.ts` | Server API |
| `app/lib/auth.ts` | Admin sessions, `requireAdmin` guard, download tokens, rate limiting |
| `app/lib/db.ts` | SQLite connection, schema creation and migrations |
| `app/lib/email.ts` | SMTP transport, notification and confirmation mails, PDF generation |
| `app/lib/file-upload.ts` | Upload validation (size, content type by magic bytes) and storage |
| `app/lib/status.ts` | Processing status values and labels |
| `app/lib/markdown.ts` | HTML escaping for the markdown renderer |

## Data Flow

1. The employee opens the public page and selects a reporting flow.
2. The form posts to `POST /api/submit-{simple|auscan|eau|childcare}`.
3. The server validates fields, dates and the optional file (PDF/JPEG/PNG, content-checked) and stores the upload under a random file name.
4. The report is saved in `submissions` with status `new`; an entry is written to `audit_log`.
5. Emails are sent: to the clerks configured for the employer (plus optional global copy) with PDF and attachment, and optionally a confirmation to the employee.
6. The response contains the report ID and a download token (valid 1 hour) for the PDF on the success page.
7. HR reviews the report in the dashboard and marks it as **Bearbeitet** (`processed`); time and user are recorded.

## API

Public (no login):

| Endpoint | Purpose |
| --- | --- |
| `POST /api/submit-simple`, `/api/submit-auscan`, `/api/submit-eau`, `/api/submit-childcare` | Submit reports |
| `GET /api/config/employers` | Employer list for the forms |
| `GET /api/cms/content?slug=` | Instructions text |
| `GET /api/public-settings` | App name and slogan |
| `POST /api/feedback` | Anonymous rating on the success page |
| `GET /api/submissions/[id]/pdf?t=<token>` | PDF of one's own report (signed token required) |
| `POST /api/auth/validate` | Public password check / admin login (sets session cookie) |
| `POST /api/auth/validate-token` | Public access token check |
| `GET /api/auth/session`, `POST /api/auth/logout` | Session status / logout |

Admin (session cookie required, otherwise `401`):

| Endpoint | Purpose |
| --- | --- |
| `GET /api/submissions` | List with filters (`type`, `status`, `search`, `employer`, dates, paging) |
| `PATCH /api/submissions/[id]` | Set processing status `{ "status": "new" \| "processed" }` |
| `DELETE /api/submissions/[id]` | Delete a report including files |
| `GET /api/submissions/[id]/pdf` | PDF of any report |
| `GET /api/submissions/today`, `/stats`, `/employers` | Dashboard data |
| `POST /api/submissions/archive` | Delete all reports of selected employers |
| `GET/PUT/DELETE /api/employers`, `POST /api/employers/order`, `POST /api/config/employers` | Employer management |
| `GET/POST /api/employer-settings` | Email routing per employer |
| `GET/POST /api/global-settings` | Global settings (secrets are never returned) |
| `PUT /api/cms/content` | Edit instructions text |
| `GET/POST /api/debug/emails`, `GET /api/debug/submission-emails` | Mail log, test mail |
| `POST /api/debug/delete-all` | Delete all data (disabled in production unless `ENABLE_DEBUG_DELETE_ALL=true`) |

## Data Model

SQLite file `data/krankmeldungen.db` (in Docker: volume `/app/data`).

| Table | Content |
| --- | --- |
| `submissions` | Reports: type, status (`new`/`processed`), `processed_at`, `processed_by`, employee data, `data_json` |
| `au_scans` | Uploaded files belonging to a report |
| `audit_log` | Mail dispatch, status changes, deletions, password requests |
| `employers`, `employer_settings` | Employers, order, colour, recipients, subject prefix |
| `global_settings` | Settings changed in the dashboard (take precedence over env), internal session secret |
| `cms_content` | Editable texts |
| `feedback` | Anonymous ratings |

`db.ts` creates missing tables and columns on startup (lightweight migrations). Reports with the legacy statuses `accepted`/`pending` are migrated to `new`.
