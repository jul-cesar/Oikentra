FROM node:22-alpine AS dependencies

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json

RUN pnpm install --filter @oikentra/auth-service... --prod --frozen-lockfile

FROM oven/bun:1.3.14-alpine AS runtime

WORKDIR /workspace

COPY --from=dependencies /workspace/node_modules ./node_modules
COPY --from=dependencies /workspace/apps/auth-service/node_modules ./apps/auth-service/node_modules
COPY --from=dependencies /workspace/packages/http-logging/node_modules ./packages/http-logging/node_modules
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json
COPY packages/http-logging/src packages/http-logging/src
COPY apps/auth-service/src apps/auth-service/src

WORKDIR /workspace/apps/auth-service

ENV NODE_ENV=production
EXPOSE 3000

USER bun
CMD ["bun", "run", "src/index.ts"]
