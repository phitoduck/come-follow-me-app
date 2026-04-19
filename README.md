# Come Follow Me App (rs-app)

Service account: `come-follow-me-svc-acct@come-follow-me-survey-app.iam.gserviceaccount.com`

## Instructions for Deployment

This app runs on a k3s homelab cluster. The image is built as a multi-arch Docker image and pushed to a private Harbor registry, then deployed via Kubernetes manifests in a separate repo.

### Prerequisites

- Docker Desktop running (for `docker buildx` multi-arch builds)
- `kubectl` configured with the k3s homelab context
- Tailscale connected (the cluster nodes are on the tailnet)
- Access to the Harbor registry at `cr.priv.mlops-club.org`

### 1. Set up the `.env` file

Create a `.env` file in this repo root. The Harbor password can be found at `~/credentials/homelab.env`.

Example `.env`:

```bash
export HARBOR_PASSWORD="your-harbor-password-here"
```

### 2. Bump the version

Edit `version.txt` to the new version number (e.g., `0.3.2`).

### 3. Build and push the image

```bash
just build-push-harbor
```

This builds for `linux/amd64` and `linux/arm64`, tags the image as `cr.priv.mlops-club.org/come-follow-me-app/rs-app:<version>`, and pushes it to Harbor.

### 4. Deploy to the k3s cluster

The Kubernetes manifests live in a separate repo: [mlops-club/homelab-cluster](https://github.com/mlops-club/homelab-cluster).

Check if it's already cloned locally before cloning again:

```bash
# Check for existing clone first
ls ~/repos/homelab-cluster 2>/dev/null || git clone https://github.com/mlops-club/homelab-cluster ~/repos/homelab-cluster
```

The relevant files in that repo:

- `apps/come-follow-me-app/manifest.yaml` - Kubernetes Deployment, Service, and Ingress
- `apps/come-follow-me-app/deploy.sh` - Deployment script (requires a `.env` in the homelab repo root)
- `env.example` - Template for the homelab `.env` (includes `CFM_APP_VERSION`, `CFM_APP_GOOGLE_CREDENTIALS_PATH`, `CFM_APP_SPREADSHEET_ID`, `HARBOR_ADMIN_PASSWORD`)

To deploy a new version, either:

**Option A**: Update the image directly with kubectl:

```bash
kubectl set image deployment/come-follow-me-app \
  -n come-follow-me-app \
  come-follow-me-app=cr.priv.mlops-club.org/come-follow-me-app/rs-app:<version>
kubectl rollout status deployment/come-follow-me-app -n come-follow-me-app
```

**Option B**: Use the deploy script (requires the homelab `.env` to be fully configured):

```bash
cd ~/repos/homelab-cluster
# Update CFM_APP_VERSION in .env to the new version
bash apps/come-follow-me-app/deploy.sh
```

### 5. Verify

```bash
# Check pod is running
kubectl get pods -n come-follow-me-app

# Check the stories endpoint returns data sorted newest-first
kubectl exec -n come-follow-me-app deploy/come-follow-me-app -- \
  python3 -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8080/stories/').read().decode())"
```

The app is accessible at `cfm.mlops-club.org` via Cloudflare Tunnel -> Traefik.

### Connecting to the cluster

If `kubectl` doesn't have the k3s context, you can set it up:

1. Ensure Tailscale is connected and `cluster-node-1` is reachable
2. Run the kubeconfig refresh script in the homelab repo:
   ```bash
   cd ~/repos/homelab-cluster
   uv run --with pyyaml refresh-kube-config.py
   ```
3. Add a context pointing to the cluster if one doesn't exist:
   ```bash
   kubectl config set-cluster k3s-homelab --server=https://cluster-node-1:6443 --insecure-skip-tls-verify=true
   kubectl config set-context k3s-homelab --cluster=k3s-homelab --user=default
   kubectl config use-context k3s-homelab
   ```

### Environment variables (production)

The following are set in the Kubernetes manifest (not in this repo):

| Variable | Description | Example |
|---|---|---|
| `RS_SURVEY__USE_CSV_SERVICE` | Set to `false` for Google Sheets | `false` |
| `RS_SURVEY__GOOGLE_SHEETS_CREDENTIALS_PATH` | Path to service account JSON inside the container | `/app/google-credentials.json` |
| `RS_SURVEY__GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheets spreadsheet ID | `12zv4FtCf_Lkpn2Vgm8...` |
