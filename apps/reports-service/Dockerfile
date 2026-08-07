FROM node:22-alpine AS dependencies

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/reports-service/package.json apps/reports-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json
COPY packages/internal-auth/package.json packages/internal-auth/package.json

RUN pnpm install --filter @oikentra/reports-service... --prod --frozen-lockfile

FROM oven/bun:1.3.14-alpine AS runtime

LABEL org.opencontainers.image.vendor="Oikentra"

WORKDIR /workspace

COPY --from=dependencies /workspace/node_modules ./node_modules
COPY --from=dependencies /workspace/apps/reports-service/node_modules ./apps/reports-service/node_modules
COPY --from=dependencies /workspace/packages/http-logging/node_modules ./packages/http-logging/node_modules
COPY --from=dependencies /workspace/packages/internal-auth/node_modules ./packages/internal-auth/node_modules
COPY apps/reports-service/package.json apps/reports-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json
COPY packages/http-logging/src packages/http-logging/src
COPY packages/internal-auth/package.json packages/internal-auth/package.json
COPY packages/internal-auth/src packages/internal-auth/src
COPY apps/reports-service/drizzle.config.ts apps/reports-service/drizzle.config.ts
COPY apps/reports-service/drizzle apps/reports-service/drizzle
COPY apps/reports-service/src apps/reports-service/src

WORKDIR /workspace/apps/reports-service

ENV NODE_ENV=production
EXPOSE 3000

USER bun
CMD ["bun", "run", "src/index.ts"]
