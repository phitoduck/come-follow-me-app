# Justfile for rs-app

# Serve both backend and frontend in development mode
# Backend runs on port 8000, frontend builds to static directory with watch mode
serve:
    #!/usr/bin/env bash
    set -e
    # Run backend and frontend in parallel
    (cd rs-frontend && pnpm exec vite build --watch) &
    (cd rs-backend && poe serve)

# Serve with Google Sheets integration
serve-google:
    #!/usr/bin/env bash
    set -e
    # Get absolute path to google-credentials.json (Just runs from Justfile directory)
    CREDENTIALS_PATH="$(pwd)/google-credentials.json"
    # Set environment variables for Google Sheets
    export RS_SURVEY__GOOGLE_SHEETS_CREDENTIALS_PATH="$CREDENTIALS_PATH"
    export RS_SURVEY__USE_CSV_SERVICE=false
    export RS_SURVEY__GOOGLE_SHEETS_SPREADSHEET_ID="12zv4FtCf_Lkpn2Vgm8WekSING4Bh6hf3keL7-yyqM-8"
    # Run backend and frontend in parallel
    (cd rs-frontend && pnpm exec vite build --watch) &
    (cd rs-backend && poe serve)

# Build frontend for production
build:
    @cd rs-frontend && pnpm build

# Build Docker image
build-docker:
    docker build -t rs-app:latest .

# Run Docker container
run-docker:
    docker run -p 8080:8080 rs-app:latest

# Run Docker container with Google Sheets integration
run-docker-google:
    #!/usr/bin/env bash
    set -e
    if [ ! -f "google-credentials.json" ]; then
        echo "Error: google-credentials.json not found"
        exit 1
    fi
    CREDENTIALS_PATH="$(pwd)/google-credentials.json"
    docker run -p 9999:8080 \
        -v "$CREDENTIALS_PATH:/app/google-credentials.json:ro" \
        -e RS_SURVEY__GOOGLE_SHEETS_CREDENTIALS_PATH=/app/google-credentials.json \
        -e RS_SURVEY__USE_CSV_SERVICE=false \
        -e RS_SURVEY__GOOGLE_SHEETS_SPREADSHEET_ID="12zv4FtCf_Lkpn2Vgm8WekSING4Bh6hf3keL7-yyqM-8" \
        rs-app:latest

