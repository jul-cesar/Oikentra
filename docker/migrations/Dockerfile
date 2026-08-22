FROM node:22-alpine

RUN apk add --no-cache postgresql-client

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY apps/business-service/package.json apps/business-service/package.json
COPY packages/http-logging/package.json packages/http-logging/package.json
COPY packages/internal-auth/package.json packages/internal-auth/package.json

RUN pnpm install --frozen-lockfile \
    --filter @oikentra/auth-service... \
    --filter @oikentra/business-service...

COPY apps/auth-service/drizzle.config.ts apps/auth-service/drizzle.config.ts
COPY apps/auth-service/drizzle apps/auth-service/drizzle
COPY apps/auth-service/src/db/schema.ts apps/auth-service/src/db/schema.ts
COPY apps/business-service/drizzle.config.ts apps/business-service/drizzle.config.ts
COPY apps/business-service/drizzle apps/business-service/drizzle
COPY apps/business-service/src/db/schema.ts apps/business-service/src/db/schema.ts
COPY docker/migrations/run-migrations.sh ./run-migrations.sh

RUN chmod +x ./run-migrations.sh

CMD ["./run-migrations.sh"]
