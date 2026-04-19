# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY rs-frontend/package.json rs-frontend/pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile
COPY rs-frontend/ .
# Override outDir to build to dist/ instead of relative path
RUN pnpm exec vite build --outDir dist

# Stage 2: Build backend with static files
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app

# Copy dependency files
COPY rs-backend/pyproject.toml rs-backend/uv.lock rs-backend/README.md ./

# Install dependencies (with cache mount)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project

# Copy backend source
COPY rs-backend/src ./src

# Copy built static files from frontend stage
COPY --from=frontend-builder /app/dist/ ./src/rs_backend/static/

# Sync project (install the project itself)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen

# Set default port
ENV PORT=8080

# Expose port
EXPOSE 8080

# Run the application
CMD uv run uvicorn rs_backend.main:app --host 0.0.0.0 --port ${PORT:-8080}
