FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Hai biến này được nhúng lúc build (rewrites / bundle phía client).
ARG BACKEND_ORIGIN
# Để trống: trình duyệt tự dùng cùng tên miền của trang cho WebSocket.
ARG NEXT_PUBLIC_WS_URL=
ENV BACKEND_ORIGIN=$BACKEND_ORIGIN \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
CMD ["node", "server.js"]
