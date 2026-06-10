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
# Base SQLite sur le volume persistant /data (survit aux redéploiements)
ENV DATABASE_URL=file:/data/nightlife.db
COPY --from=builder /app ./
VOLUME /data
EXPOSE 3000
# start.sh : prisma db push + next start (seed démo via instrumentation.ts si base vide)
CMD ["bash", "start.sh"]
