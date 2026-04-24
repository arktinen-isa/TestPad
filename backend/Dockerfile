# Stage 1 — build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# Stage 2 — compile backend TypeScript
FROM node:20-alpine AS backend-builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .
RUN npx prisma generate
RUN npm run build

# Stage 3 — lean production image
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=backend-builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=backend-builder /app/dist            ./dist
COPY --from=backend-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/prisma          ./prisma

# Frontend static files served by Express at /public
COPY --from=frontend-builder /frontend/dist      ./public

EXPOSE 3000

CMD ["sh", "-c", "node_modules/.bin/prisma db push --accept-data-loss && node dist/seed.js && node dist/index.js"]
