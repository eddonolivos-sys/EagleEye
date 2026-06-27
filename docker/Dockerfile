# syntax=docker/dockerfile:1

# --- Stage 1: instala dependencias y auto-aloja los assets de MediaPipe ---
FROM node:24-bookworm-slim AS vendor
WORKDIR /app
RUN corepack enable
# Manifiestos primero (capa cacheable: no se reinstala si solo cambia el codigo)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/protocol/package.json packages/protocol/package.json
COPY apps/client/package.json apps/client/package.json
COPY tools/docs-gen/package.json tools/docs-gen/package.json
RUN pnpm install --frozen-lockfile
# Codigo y vendoring (descarga el modelo con verificacion SHA-256)
COPY . .
RUN pnpm --filter @eagleeye/client run vendor

# --- Stage 2: Caddy sirve el cliente estatico (HTTPS + auto-redirect) ---
FROM caddy:2-alpine
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=vendor /app/apps/client/public /srv
EXPOSE 80 443
# La imagen de Caddy ya define el ENTRYPOINT/CMD que lee /etc/caddy/Caddyfile.
