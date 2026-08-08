# Build context: raiz do monorepo (precisa de libs/, nx.json, tsconfig.base.json)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY nx.json tsconfig.base.json ./
COPY libs ./libs
COPY apps/ui-financial ./apps/ui-financial

RUN npx nx build ui-financial --configuration=production

FROM nginx:alpine

COPY --from=builder /app/dist/apps/ui-financial/browser /usr/share/nginx/html
COPY apps/ui-financial/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/ui-financial/docker/config.template.js /usr/share/nginx/html/config.template.js
COPY apps/ui-financial/docker/40-generate-config.sh /docker-entrypoint.d/40-generate-config.sh
RUN chmod +x /docker-entrypoint.d/40-generate-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
