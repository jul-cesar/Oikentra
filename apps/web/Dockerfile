# syntax=docker/dockerfile:1

FROM node:24-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

FROM base AS deps

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/location-catalog/package.json packages/location-catalog/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store,sharing=locked \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --filter @oikentra/web...

FROM base AS builder

WORKDIR /app


ARG NEXT_PUBLIC_AUTH_BASE_URL=https://api.oikentra.com/api/auth
ENV NEXT_PUBLIC_AUTH_BASE_URL=$NEXT_PUBLIC_AUTH_BASE_URL
ARG BUSINESS_BASE_URL=https://api.oikentra.com/api/business
ENV BUSINESS_BASE_URL=$BUSINESS_BASE_URL
ARG REPORTS_BASE_URL
ENV REPORTS_BASE_URL=$REPORTS_BASE_URL
ARG AI_BASE_URL
ENV AI_BASE_URL=$AI_BASE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

RUN --mount=type=cache,id=next-web,target=/app/apps/web/.next/cache,sharing=locked \
    ./apps/web/node_modules/.bin/next build apps/web

FROM node:24-alpine AS runner

LABEL org.opencontainers.image.vendor="Oikentra"

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ARG AI_BASE_URL
ENV AI_BASE_URL=$AI_BASE_URL

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER 1001

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
