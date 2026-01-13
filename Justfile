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

# Build Docker image (single architecture for local testing)
build-docker:
    #!/usr/bin/env bash
    set -e
    VERSION=$(cat version.txt | tr -d '[:space:]')
    docker build -t eriddoch/come-follow-me-app:$VERSION .

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

# Build and push Docker image to Docker Hub (multi-architecture: amd64 and arm64)
build-push-dockerhub:
    #!/usr/bin/env bash
    set -e
    VERSION=$(cat version.txt | tr -d '[:space:]')
    # Create buildx builder if it doesn't exist
    if ! docker buildx ls | grep -q multiarch-builder; then
        docker buildx create --name multiarch-builder --use --bootstrap || true
    fi
    docker buildx use multiarch-builder
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        -t eriddoch/come-follow-me-app:$VERSION \
        --push \
        .

# Build and push Docker image to Harbor private registry (multi-architecture: amd64 and arm64)
# Requires: HARBOR_PASSWORD environment variable
build-push-harbor:
    #!/usr/bin/env bash
    set -ex
    VERSION=$(cat version.txt | tr -d '[:space:]')
    source .env
    echo "$HARBOR_PASSWORD" | docker login cr.priv.mlops-club.org -u admin --password-stdin
    # Create buildx builder if it doesn't exist
    if ! docker buildx ls | grep -q multiarch-builder; then
        docker buildx create --name multiarch-builder --use --bootstrap || true
    fi
    docker buildx use multiarch-builder
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        -t cr.priv.mlops-club.org/come-follow-me-app/rs-app:$VERSION \
        --push \
        .
