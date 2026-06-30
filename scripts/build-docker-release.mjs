#!/usr/bin/env node
/**
 * Assemble Docker release bundle under release/docker/
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const releaseDir = path.join(root, 'release', 'docker')

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
}

function run(cmd) {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: root })
}

const copies = [
  ['Dockerfile', 'Dockerfile'],
  ['docker-compose.yml', 'docker-compose.yml'],
  ['docker-compose.build.yml', 'docker-compose.build.yml'],
  ['.dockerignore', '.dockerignore'],
]

console.log('=== OneBoard Docker release bundle ===')
run('npm run build')

fs.mkdirSync(releaseDir, { recursive: true })
for (const [src, dest] of copies) {
  copyFile(path.join(root, src), path.join(releaseDir, dest))
}

const envExample = `# OneBoard Docker — production (pull image, no local build)
ONEBOARD_IMAGE=ghcr.io/oneboard/oneboard:1.1
ONEBOARD_PORT=8866

ONEBORD_RUNTIME=docker
ONEBORD_HOST=0.0.0.0

# Optional same-host upstream:
# ONEBORD_MIHOMO_UPSTREAM=http://127.0.0.1:9090
# ONEBORD_VOHIVE_UPSTREAM=http://127.0.0.1:7575

ONEBORD_PROC_ROOT=/host/proc
ONEBORD_DISK_PATH=/host/root
`
fs.writeFileSync(path.join(releaseDir, '.env.example'), envExample)

const readme = `# OneBoard Docker Release

Production uses a **pre-built multi-arch image**. Target devices only need Docker — no Node.js, no \`npm ci\`, no \`npm run build\`.

## Supported architectures

- \`linux/amd64\`
- \`linux/arm64\`
- \`linux/arm/v7\` (ARMv7 — required, not optional)

Built by GitHub Actions (\`.github/workflows/docker-image.yml\`) with \`node:22-bookworm-slim\`.

## Deploy on device / NAS / 飞牛

\`\`\`bash
docker compose pull
docker compose up -d
\`\`\`

Set image in \`.env\` if needed:

\`\`\`env
ONEBOARD_IMAGE=ghcr.io/<owner>/oneboard:1.1
\`\`\`

## 飞牛 docker.fnnas.com 401

If \`docker.fnnas.com\` returns **401** when pulling \`node:22-alpine\` or other base images, **do not run local build on the NAS**. Use the remote GHCR image above (\`docker compose pull\`).

## Local build (maintainers)

\`\`\`bash
docker compose -f docker-compose.build.yml build
docker compose -f docker-compose.build.yml up -d
\`\`\`

## Volumes

Only data + host metrics — never mount \`src/\`, \`dist/\`, or \`node_modules/\`:

- \`onebord-data:/app/.onebord\`
- \`/proc:/host/proc:ro\`
- \`/\:/host/root:ro\`

## Verify

\`\`\`bash
curl http://127.0.0.1:8866/api/health
curl http://127.0.0.1:8866/api/control-plane/snapshot
\`\`\`
`
fs.writeFileSync(path.join(releaseDir, 'README.md'), readme)

console.log('')
console.log('Done.')
console.log(`  Release dir: ${releaseDir}`)
console.log('  Device deploy: docker compose pull && docker compose up -d')
