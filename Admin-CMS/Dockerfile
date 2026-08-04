# ─── Admin CMS Dockerfile ──────────────────────────────────────────────────────
# Two-stage build:
#   Stage 1 (builder): Node 20 — install deps, inject env vars, run Vite build
#   Stage 2 (runner):  Node 20 Alpine — serve dist/ with `serve -s` (SPA mode)
#
# Traefik sits in front and routes admin.kemetekai.com → this container:4173
# VITE_ variables are baked into the JS bundle at build time (not runtime).
# ──────────────────────────────────────────────────────────────────────────────

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (cache-friendly layer)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Build-time env vars (Vite bakes VITE_* into the bundle at build time)
ARG VITE_API_BASE_URL
ARG VITE_API_ORIGIN
ARG VITE_API_TIMEOUT=30000
ARG VITE_SESSION_TIMEOUT=1800000
ARG VITE_ENABLE_LOGGING=false
ARG VITE_ENABLE_2FA=true

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_ORIGIN=$VITE_API_ORIGIN \
    VITE_API_TIMEOUT=$VITE_API_TIMEOUT \
    VITE_SESSION_TIMEOUT=$VITE_SESSION_TIMEOUT \
    VITE_ENABLE_LOGGING=$VITE_ENABLE_LOGGING \
    VITE_ENABLE_2FA=$VITE_ENABLE_2FA

COPY . .
RUN npm run build

# ─── Stage 2: Runtime (serve) ─────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# `serve` is a production-grade static file server.
# -s (single-page app) redirects all 404s back to index.html
# so React Router client-side navigation works correctly.
RUN npm install -g serve@14

# Non-root user — this container only ever reads static files from ./dist,
# so no volume-ownership dance is needed (unlike the backend's uploads/).
RUN addgroup --system --gid 1001 appgroup \
    && adduser  --system --uid 1001 --ingroup appgroup appuser

# Copy only the built output — no source code in the final image
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist

USER appuser

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:4173/ || exit 1

CMD ["serve", "-s", "dist", "-l", "4173"]
