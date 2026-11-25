# Build the API from the monorepo root so pnpm can resolve workspace packages.
FROM node:24-bookworm-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
WORKDIR /workspace

RUN corepack enable

# Install the exact dependency graph recorded in pnpm-lock.yaml.
COPY . .
RUN pnpm install --frozen-lockfile

# The API imports the shared contracts package and uses a generated Prisma client.
RUN pnpm --filter @lumen/contracts build \
    && pnpm --filter @lumen/api db:generate \
    && pnpm --filter @lumen/api build

# Create a portable production-only workspace containing the API and its runtime dependencies.
RUN pnpm --filter @lumen/api deploy --prod --legacy /out

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Run as the unprivileged node user supplied by the official Node image.
COPY --from=build --chown=node:node /out/ ./

USER node
EXPOSE 4000

# Readiness includes a database query; Docker/Compose can therefore distinguish
# a running process from an API that can actually serve requests.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4000/api/v1/health/ready').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "dist/main.js"]
