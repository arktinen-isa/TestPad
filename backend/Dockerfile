# Stage 1 — compile TypeScript
# Build context = repo root (Railway default)
FROM node:20-alpine AS builder
WORKDIR /app

# Copy only backend package files first (better layer caching)
COPY backend/package*.json ./
RUN npm ci

# Copy backend source
COPY backend/ .

# Generate Prisma client + compile TS
RUN npx prisma generate
RUN npm run build

# Stage 2 — production image
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Copy compiled output and Prisma artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
