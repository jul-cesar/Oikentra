FROM node:22-alpine AS dependencies

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json
COPY packages/internal-auth/package.json packages/internal-auth/package.json

ARG INSTALL_DEV_DEPENDENCIES=false
RUN if [ "$INSTALL_DEV_DEPENDENCIES" = "true" ]; then \
		pnpm install --filter @oikentra/auth-service... --frozen-lockfile; \
	else \
		pnpm install --filter @oikentra/auth-service... --prod --frozen-lockfile; \
	fi

FROM oven/bun:1.3.14-alpine AS runtime

LABEL org.opencontainers.image.vendor="Oikentra"

WORKDIR /workspace

COPY --from=dependencies /workspace/node_modules ./node_modules
COPY --from=dependencies /workspace/apps/auth-service/node_modules ./apps/auth-service/node_modules
COPY --from=dependencies /workspace/packages/http-logging/node_modules ./packages/http-logging/node_modules
COPY --from=dependencies /workspace/packages/internal-auth/node_modules ./packages/internal-auth/node_modules
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json
COPY packages/http-logging/src packages/http-logging/src
COPY packages/internal-auth/package.json packages/internal-auth/package.json
COPY packages/internal-auth/src packages/internal-auth/src
COPY apps/auth-service/drizzle.config.ts apps/auth-service/drizzle.config.ts
COPY apps/auth-service/drizzle apps/auth-service/drizzle
COPY apps/auth-service/src apps/auth-service/src

WORKDIR /workspace/apps/auth-service

ENV NODE_ENV=production
EXPOSE 3000

USER 1000
CMD ["sh", "-c", "bun run src/db/migrate-on-startup.ts && exec bun run src/index.ts"]
