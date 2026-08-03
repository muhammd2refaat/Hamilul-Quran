# ─── Frontend Dockerfile (Next.js Standalone) ──────────────────────────────────
# Three-stage build for minimal image size:
#   Stage 1 (deps):    Install all node_modules
#   Stage 2 (builder): Build Next.js with output:standalone
#   Stage 3 (runner):  Minimal Node image running only the standalone output
#
# NEXT_PUBLIC_* vars are baked in at build time.
# ──────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Dependency installation ────────────────────────────────────────
FROM node:20-alpine AS deps

# libc6-compat needed for some native modules on Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy installed modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Build-time env vars (NEXT_PUBLIC_* are inlined into the JS bundle)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Disable Next.js telemetry in CI/Docker
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser  --system --uid 1001 nextjs

# Copy the standalone output (server.js + all required files)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Copy static assets (CSS, JS chunks, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static
# Copy public folder (favicons, OG images, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public         ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
