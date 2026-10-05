# Security

## Security Goals

- Protect personal and operational data in municipal workflows.
- Prevent accidental disclosure of secrets and internal artifacts.
- Keep operational controls auditable and maintainable.

## Data Classification (Practical Model)

- Public: source code, non-sensitive public assets, generic docs.
- Internal: architecture/operations notes without personal data.
- Confidential: credentials, personal form payloads, email routing specifics, runtime DB content.

Only public/internal-safe content should be committed.

## Secret Handling

- Store secrets only in local environment files or dedicated secret managers.
- Never commit `.env.local` or production credentials.
- Keep `.env.example` as placeholder template values only.
- Rotate secrets when moving between staging and production.

## Repository Safeguards

Current `.gitignore` excludes:

- `.env*` (except `.env.example`)
- runtime DB files (`*.db`, `*.db-shm`, `*.db-wal`, `data/`)
- upload data (`uploads/`)
- internal docs/artifacts (`doku2.md`, `manual.html`, `manual-assets/`, `artifacts/`)
- backup remnants (`*.backup`)

## Upload and File Risks

Server-side controls should remain active:

- allow-list file extensions/types
- maximum file size limits
- server-side generated unique filenames
- strict path handling to avoid traversal issues

Operational recommendations:

- use malware scanning where policy requires it
- enforce retention/deletion policy for uploads
- ensure restricted filesystem permissions on upload directories

## API and Access Considerations

- Admin login issues an HMAC-signed, `HttpOnly`, `SameSite=Strict` session cookie (`sb-session`). Every admin, debug and data API enforces it server-side (`requireAdmin` in `app/lib/auth.ts`); changing the admin credentials invalidates all sessions.
- Set `SESSION_SECRET` (min. 32 random chars). If unset, a random secret is generated and stored in the database.
- Submission PDFs are only available to admins or via a short-lived signed download token issued at submission time.
- `/api/global-settings` never returns secrets (SMTP/admin/public passwords, access token); saving an empty secret keeps the stored value.
- Debug "delete all" is disabled in production unless `ENABLE_DEBUG_DELETE_ALL=true`.
- CMS markdown is HTML-escaped before rendering; a restrictive CSP and further security headers are set in `next.config.ts`.
- Login endpoints are rate limited in-process; additionally rate limit at the edge/proxy.
- Public form submission endpoints are intentionally unauthenticated; the public password gate is UI-only. Protect them at the proxy (rate limiting, bot protection) if abuse is a concern.

## Incident Response Basics

If exposure is suspected:

1. Revoke and rotate affected credentials immediately.
2. Isolate impacted environment and preserve logs.
3. Assess scope: data types, timeline, potentially affected subjects.
4. Execute municipal reporting and legal obligations.
5. Document remediation and update preventive controls.
