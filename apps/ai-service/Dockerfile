FROM node:24-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

FROM base AS deps

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ai-service/package.json apps/ai-service/package.json
COPY packages/internal-auth/package.json packages/internal-auth/package.json

RUN pnpm install --frozen-lockfile --filter @oikentra/ai-service...

FROM base AS builder

WORKDIR /workspace

COPY --from=deps /workspace/package.json ./package.json
COPY --from=deps /workspace/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=deps /workspace/apps/ai-service/node_modules ./apps/ai-service/node_modules
COPY --from=deps /workspace/packages/internal-auth/node_modules ./packages/internal-auth/node_modules
COPY apps/ai-service apps/ai-service
COPY packages/internal-auth packages/internal-auth

RUN pnpm --filter @oikentra/ai-service build

FROM node:24-alpine AS runtime

LABEL org.opencontainers.image.vendor="Oikentra"

WORKDIR /workspace/apps/ai-service

ENV NODE_ENV=production
ENV PORT=3333

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 eve

COPY --from=builder --chown=eve:nodejs /workspace/apps/ai-service/.output ./.output
COPY --from=builder --chown=eve:nodejs /workspace/apps/ai-service/package.json ./package.json

RUN mkdir -p .eve/.workflow-data && chown -R eve:nodejs /workspace/apps/ai-service

USER 1001

EXPOSE 3333

CMD ["node", ".output/server/index.mjs"]
