# syntax=docker/dockerfile:1.7

# Node.js 24 = current Active LTS (Node.js 20 is end-of-life).
# Rebuild regularly to pick up Node.js and Debian security patches:
#   docker compose build --pull
ARG NODE_IMAGE=node:24-trixie-slim

############################
# 1) Dependencies
############################
# better-sqlite3 ships prebuilt binaries for linux x64/arm64, so no compiler is needed.
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

############################
# 2) Build
############################
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

############################
# 3) Runtime
############################
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=/app/data/krankmeldungen.db \
    UPLOAD_DIR=/app/uploads

# Non-root user (UID/GID 1001, compatible with volumes created by earlier images).
# npm/corepack are not needed at runtime; removing them shrinks the attack surface.
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs --no-create-home --shell /usr/sbin/nologin nextjs \
 && npm uninstall -g npm corepack \
 && mkdir -p /app/data /app/uploads \
 && chown -R nextjs:nodejs /app/data /app/uploads

# Application files stay owned by root (read-only for the runtime user)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
VOLUME ["/app/data", "/app/uploads"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/public-settings').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
