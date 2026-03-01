# Operations

## Runtime Requirements

- Node.js 20+
- npm 10+
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
