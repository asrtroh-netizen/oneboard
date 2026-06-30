# OneBoard — multi-stage production image (build runs in CI, not on device)
# Base: Debian bookworm slim (glibc) — better ARM/armv7 compatibility than Alpine/musl.

FROM node:22-bookworm-slim AS build
WORKDIR /app

ENV npm_config_update_notifier=false \
    npm_config_fund=false

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.js index.html ./
COPY public ./public
COPY src ./src
COPY server ./server
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    ONEBORD_HOST=0.0.0.0 \
    ONEBORD_PORT=8866 \
    ONEBORD_RUNTIME=docker \
    npm_config_update_notifier=false \
    npm_config_fund=false

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY server ./server

EXPOSE 8866

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.ONEBORD_PORT||8866)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/gateway.js"]
