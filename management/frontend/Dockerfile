# ── Stage 1: Build (Node 22 + Bun) ───────────────────────────────────────────────
FROM docker.m.daocloud.io/library/node:22-bullseye-slim AS build-stage

# Install Bun via NPM (avoids all pure-Bun Docker filesystem/node-compat bugs)
RUN npm config set registry https://registry.npmmirror.com/ && \
    npm install -g bun

WORKDIR /app/frontend

# Build frontend completely isolated from root workspace
COPY frontend/package.json .
ENV BUN_CONFIG_REGISTRY=https://registry.npmmirror.com/
ENV CI=true

# Standard install, no hacky symlink fixes needed because we are using real Node.js
RUN bun install --ignore-scripts

# Copy frontend source & build
COPY ./frontend /app/frontend

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

# This will transparently use the real Node executable when .bin shims ask for #!/usr/bin/env node
RUN bun run build

# ── Stage 2: Serve (Nginx Alpine) ────────────────────────────────────────────
FROM docker.m.daocloud.io/library/nginx:alpine

COPY --from=build-stage /app/frontend/dist/ /usr/share/nginx/html
COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8083
