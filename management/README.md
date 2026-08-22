# Ego Management Platform

This directory contains the non-hardware management platform for the device and mobile clients.
It follows the Omega foundation: React 19, Vite, TanStack Router/Query/Table/Form,
Tailwind v4 and shadcn conventions on the frontend; FastAPI, SQLModel async and Alembic on the backend.

## Development

```bash
# backend
cd management/backend
cp .env.example .env
uv sync --all-groups
uv run alembic upgrade head
uv run fastapi dev app/main.py --port 8010

# management frontend (repository root)
pnpm admin:dev
```

The device/mobile Vite development server proxies `/management-api` to
`MANAGEMENT_API_TARGET` (default `http://127.0.0.1:8010`). The production device
server uses the same environment variable and proxy path, so management API
credentials never need to be embedded in frontend builds.

Development bootstrap credentials are `admin@ego.example.com` / `EgoAdmin123!`.
Replace the password and JWT secret before production use.

## Validation

```bash
cd management/backend && uv run pytest && uv run ruff check app tests && uv run mypy app
pnpm admin:test && pnpm admin:build
```
