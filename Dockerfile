FROM node:22-slim

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma.config.ts ./
COPY prisma ./prisma
# generate never connects to the DB; placeholder only satisfies prisma.config.ts
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm exec prisma generate

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

# Apply migrations, seed only if empty, then start with hot reload
CMD ["sh", "-c", "pnpm db:deploy && pnpm db:seed && pnpm dev"]
