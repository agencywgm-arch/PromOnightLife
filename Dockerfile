# --- Build ---
FROM node:20-slim AS builder
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

# --- Run ---
FROM node:20-slim
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
# DATABASE_URL (PostgreSQL) est fourni à l'exécution (docker-compose, Railway, etc.)
COPY --from=builder /app ./
EXPOSE 3000
# start.sh : prisma db push + next start (seed démo via instrumentation.ts si base vide)
CMD ["bash", "start.sh"]
