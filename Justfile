# Justfile for rs-app

# Serve both backend and frontend in development mode
# Backend runs on port 8000, frontend builds to static directory with watch mode
serve:
    #!/usr/bin/env bash
    set -e
    # Run backend and frontend in parallel
    (cd rs-backend && poe serve) &
    (cd rs-frontend && pnpm exec vite build --watch) &
    wait

# Build frontend for production
build:
    @cd rs-frontend && pnpm build

