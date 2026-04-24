# Stage 1 — compile TypeScript
# Railway build context = repo root
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .
RUN npx prisma generate
RUN npm run build

# Stage 2 — lean production image
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist            ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma          ./prisma

EXPOSE 3000

CMD ["sh", "-c", "node_modules/.bin/prisma db push --accept-data-loss && node dist/index.js"]
