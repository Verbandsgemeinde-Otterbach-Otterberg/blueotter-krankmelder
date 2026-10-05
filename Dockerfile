# syntax=docker/dockerfile:1.7

############################
# 1) Dependencies
############################
FROM node:20-alpine AS deps
WORKDIR /app

# better-sqlite3 / sqlite3 brauchen Build-Tools (native bindings)
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

############################
# 2) Build
############################
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat python3 make g++

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

############################
# 3) Runtime
############################
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat tini

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=/app/data/krankmeldungen.db
ENV UPLOAD_DIR=/app/uploads

# Non-root User
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone-Output + statische Assets + public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Persistente Verzeichnisse anlegen
RUN mkdir -p /app/data /app/uploads \
 && chown -R nextjs:nodejs /app/data /app/uploads

USER nextjs

EXPOSE 3000
VOLUME ["/app/data", "/app/uploads"]

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
