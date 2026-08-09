FROM node:22-alpine AS dependencies

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/business-service/package.json apps/business-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json
COPY packages/internal-auth/package.json packages/internal-auth/package.json

ARG INSTALL_DEV_DEPENDENCIES=false
RUN if [ "$INSTALL_DEV_DEPENDENCIES" = "true" ]; then \
		pnpm install --filter @oikentra/business-service... --frozen-lockfile; \
	else \
		pnpm install --filter @oikentra/business-service... --prod --frozen-lockfile; \
	fi

FROM oven/bun:1.3.14-alpine AS runtime

LABEL org.opencontainers.image.vendor="Oikentra"

WORKDIR /workspace

COPY --from=dependencies /workspace/node_modules ./node_modules
COPY --from=dependencies /workspace/apps/business-service/node_modules ./apps/business-service/node_modules
COPY --from=dependencies /workspace/packages/http-logging/node_modules ./packages/http-logging/node_modules
COPY --from=dependencies /workspace/packages/internal-auth/node_modules ./packages/internal-auth/node_modules
COPY apps/business-service/package.json apps/business-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json
COPY packages/http-logging/src packages/http-logging/src
COPY packages/internal-auth/package.json packages/internal-auth/package.json
COPY packages/internal-auth/src packages/internal-auth/src
COPY apps/business-service/drizzle.config.ts apps/business-service/drizzle.config.ts
COPY apps/business-service/drizzle apps/business-service/drizzle
COPY apps/business-service/src apps/business-service/src

WORKDIR /workspace/apps/business-service

ENV NODE_ENV=production
EXPOSE 3000

USER 1000
CMD ["bun", "run", "src/index.ts"]
