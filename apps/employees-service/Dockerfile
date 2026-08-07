FROM node:22-alpine AS dependencies

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/employees-service/package.json apps/employees-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json
COPY packages/internal-auth/package.json packages/internal-auth/package.json

RUN pnpm install --filter @oikentra/employees-service... --prod --frozen-lockfile

FROM oven/bun:1.3.14-alpine AS runtime

LABEL org.opencontainers.image.vendor="Oikentra"

WORKDIR /workspace

COPY --from=dependencies /workspace/node_modules ./node_modules
COPY --from=dependencies /workspace/apps/employees-service/node_modules ./apps/employees-service/node_modules
COPY --from=dependencies /workspace/packages/http-logging/node_modules ./packages/http-logging/node_modules
COPY --from=dependencies /workspace/packages/internal-auth/node_modules ./packages/internal-auth/node_modules
COPY apps/employees-service/package.json apps/employees-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json
COPY packages/http-logging/src packages/http-logging/src
COPY packages/internal-auth/package.json packages/internal-auth/package.json
COPY packages/internal-auth/src packages/internal-auth/src
COPY apps/employees-service/drizzle.config.ts apps/employees-service/drizzle.config.ts
COPY apps/employees-service/drizzle apps/employees-service/drizzle
COPY apps/employees-service/src apps/employees-service/src

WORKDIR /workspace/apps/employees-service

ENV NODE_ENV=production
EXPOSE 3000

USER bun
CMD ["bun", "run", "src/index.ts"]
