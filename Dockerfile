# syntax=docker/dockerfile:1

# Node.js 24 = current Active LTS. Rebuild the image regularly to pick up
# Node.js and Debian security patches (e.g. `docker compose build --pull`).
ARG NODE_IMAGE=node:24-trixie-slim

# --- Dependencies (better-sqlite3 uses prebuilt binaries for linux x64/arm64) ---
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# --- Build ---
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Runtime ---
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads

# npm/corepack are not needed at runtime; removing them shrinks the attack surface
RUN npm uninstall -g npm corepack \
 && mkdir -p /app/data /app/uploads \
 && chown -R node:node /app/data /app/uploads

COPY --from=builder --chown=root:root /app/public ./public
COPY --from=builder --chown=root:root /app/.next/standalone ./
COPY --from=builder --chown=root:root /app/.next/static ./.next/static

USER node
VOLUME ["/app/data", "/app/uploads"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/public-settings').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
