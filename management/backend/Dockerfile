# ── Stage 1: Builder ───────────────────────────────────────────────────────────
FROM docker.m.daocloud.io/library/python:3.10-slim AS builder

# Install uv – https://docs.astral.sh/uv/guides/integration/docker/
COPY --from=ghcr.io/astral-sh/uv:0.9.26 /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple/ \
    UV_HTTP_TIMEOUT=120

WORKDIR /app

# Place virtual-env executables on PATH
ENV PATH="/app/.venv/bin:$PATH"

# 1) Install dependencies (rarely changes → cached layer)
COPY uv.lock pyproject.toml /app/
COPY backend/pyproject.toml /app/backend/
RUN uv sync --no-install-workspace --no-dev --package app

# 2) Copy application source
COPY ./backend /app/backend

# 3) Install the workspace package itself
RUN uv sync --no-dev --package app


# ── Stage 2: Runtime (no uv, no build tools, minimal image) ──────────────────
FROM docker.m.daocloud.io/library/python:3.10-slim

WORKDIR /app/backend

# Copy only the venv and the application code from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/backend /app/backend

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["fastapi", "run", "--workers", "4", "app/main.py"]
