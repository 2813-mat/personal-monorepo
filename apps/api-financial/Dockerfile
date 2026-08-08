# Build context: raiz do monorepo (precisa de libs/, nx.json, tsconfig.base.json)
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY nx.json tsconfig.base.json ./
COPY libs ./libs
COPY apps/api-financial ./apps/api-financial

RUN npx prisma generate --schema=apps/api-financial/src/infrastructure/prisma/schema.prisma

RUN npx nx build api-financial --configuration=production

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=apps/api-financial/src/infrastructure/prisma/schema.prisma && node dist/apps/api-financial/main.js"]
