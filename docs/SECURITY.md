# Security

## Goals

- Protect personal health and personnel data (special category data under GDPR Art. 9).
- Prevent disclosure of credentials and internal configuration.
- Keep administrative actions traceable.

## Authentication and Authorization

- **Admin dashboard:** login with `DASHBOARD_USER` / `DASHBOARD_PASSWORD` issues an HMAC-signed session cookie `sb-session` (`HttpOnly`, `SameSite=Strict`, `Secure` in production; 12 h, or 7 days with "remember me"). Changing the admin credentials invalidates all sessions. Logout clears the cookie.
- **Server-side enforcement:** every admin, data and debug API calls `requireAdmin` (`app/lib/auth.ts`) and returns `401` without a valid session. State-changing requests additionally check the `Origin` header.
- **Report PDFs:** available to admins, or to the submitter with a signed download token that is valid for one hour and bound to the report ID.
- **Public forms:** the public password gate is a UI convenience only; submit endpoints are intentionally reachable without login. Protect them with rate limiting / bot protection at the proxy.
- **Brute force:** login, token check and password request endpoints are rate limited per IP (in-process). Add rate limiting at the proxy as well, especially with multiple instances.

## Secrets

- `SESSION_SECRET` signs sessions and download tokens. If unset, a random secret is generated and stored in the database.
- `/api/global-settings` never returns secrets (SMTP password, admin/public passwords, access token); leaving a secret field empty on save keeps the stored value. Only known setting keys are accepted.
- Never commit `.env*` files (except `.env.example`); `.dockerignore` keeps them out of the image.
- Rotate credentials when moving between environments and after any suspected exposure.

## Input and Output Handling

- Uploads: size limit, content type verified by magic bytes (PDF/JPEG/PNG), random server-side file names, file mode `0600`.
- CMS markdown is HTML-escaped before rendering (no stored XSS).
- HTTP headers (`next.config.ts`): Content-Security-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`; `X-Powered-By` disabled.
- SQL uses prepared statements throughout.

## Platform

- Node.js 24 LTS; Next.js, nodemailer and jsPDF on patched versions; unused dependencies removed. Check with `npm audit --omit=dev`.
- Docker image runs as non-root with read-only root filesystem, dropped capabilities and `no-new-privileges` (see [Operations](OPERATIONS.md#docker-deployment)).
- Debug "delete all" is disabled in production unless `ENABLE_DEBUG_DELETE_ALL=true`.

## Known Limitations

- Admin and public passwords are stored in plain text (env / database). Restrict access to `.env.local`, the database and backups accordingly.
- The "request password" function emails the admin password to the global HR address; consider disabling it.
- In-process rate limiting does not share state across instances.

## Reporting Vulnerabilities

Please report security issues privately to the maintainer instead of opening a public issue.

## Incident Response

1. Revoke and rotate affected credentials immediately.
2. Isolate the affected environment and preserve logs.
3. Assess scope: data types, timeline, affected persons.
4. Fulfil reporting obligations (GDPR Art. 33/34, data protection officer).
5. Document remediation and update preventive controls.
