# syntax=docker/dockerfile:1
# Contexto de build = raiz do repositorio (ver compose.yaml).
# Estagio 1: compila o TypeScript (precisa das devDependencies).
# Estagio 2: instala SO as dependencias de producao e copia o dist.
# (pnpm deploy nao e usado: no pnpm 10.0.0 exige inject-workspace-packages.)
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS manifests
WORKDIR /repo
# Todos os package.json do workspace, para o --frozen-lockfile bater com o pnpm-lock.yaml.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/ai/package.json packages/ai/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/messaging/package.json packages/messaging/package.json

FROM manifests AS build
RUN corepack enable
RUN pnpm install --frozen-lockfile --filter @cyber/worker...
COPY apps/worker apps/worker
RUN pnpm --filter @cyber/worker build

FROM manifests AS run
ENV NODE_ENV=production
RUN corepack enable
RUN pnpm install --frozen-lockfile --prod --filter @cyber/worker...
COPY --from=build /repo/apps/worker/dist apps/worker/dist
WORKDIR /repo/apps/worker
USER node
CMD ["node", "dist/index.js"]
