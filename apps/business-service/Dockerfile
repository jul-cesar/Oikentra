FROM node:22-alpine AS dependencies

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/business-service/package.json apps/business-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json

RUN pnpm install --filter @oikentra/business-service --prod --frozen-lockfile

FROM oven/bun:1.3.14-alpine AS runtime

WORKDIR /workspace

COPY --from=dependencies /workspace/node_modules ./node_modules
COPY --from=dependencies /workspace/apps/business-service/node_modules ./apps/business-service/node_modules
COPY apps/business-service/package.json apps/business-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json
COPY packages/http-logging/src packages/http-logging/src
COPY apps/business-service/drizzle.config.ts apps/business-service/drizzle.config.ts
COPY apps/business-service/drizzle apps/business-service/drizzle
COPY apps/business-service/src apps/business-service/src

WORKDIR /workspace/apps/business-service

ENV NODE_ENV=production
EXPOSE 3000

USER bun
CMD ["bun", "run", "src/index.ts"]
