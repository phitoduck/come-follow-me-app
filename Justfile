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

