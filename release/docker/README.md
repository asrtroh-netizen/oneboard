# OneBoard Docker Release

Production uses a **pre-built multi-arch image**. Target devices only need Docker — no Node.js, no `npm ci`, no `npm run build`.

## Supported architectures

- `linux/amd64`
- `linux/arm64`
- `linux/arm/v7` (ARMv7 — required, not optional)

Built by GitHub Actions (`.github/workflows/docker-image.yml`) with `node:22-bookworm-slim`.

## Deploy on device / NAS / 飞牛

```bash
docker compose pull
docker compose up -d
```

Set image in `.env` if needed:

```env
ONEBOARD_IMAGE=ghcr.io/<owner>/oneboard:1.1
```

## 飞牛 docker.fnnas.com 401

If `docker.fnnas.com` returns **401** when pulling `node:22-alpine` or other base images, **do not run local build on the NAS**. Use the remote GHCR image above (`docker compose pull`).

## Local build (maintainers)

```bash
docker compose -f docker-compose.build.yml build
docker compose -f docker-compose.build.yml up -d
```

## Volumes

Only data + host metrics — never mount `src/`, `dist/`, or `node_modules/`:

- `onebord-data:/app/.onebord`
- `/proc:/host/proc:ro`
- `/:/host/root:ro`

## Verify

```bash
curl http://127.0.0.1:8866/api/health
curl http://127.0.0.1:8866/api/control-plane/snapshot
```
