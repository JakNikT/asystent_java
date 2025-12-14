# Multi-stage Dockerfile dla Asystent Nart
# Stage 1: Builder - instalacja zależności i build frontendu
FROM node:20-alpine AS builder

WORKDIR /app

# Kopiuj pliki konfiguracyjne
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Instalacja zależności (wszystkie - dev i prod)
RUN npm ci

# Kopiuj kod źródłowy
COPY . .

# Build frontendu (tylko w production, w dev nie potrzebujemy)
ARG NODE_ENV=production
RUN if [ "$NODE_ENV" = "production" ]; then npm run build; else mkdir -p dist; fi

# Stage 2: Runtime - tylko runtime dependencies
FROM node:20-alpine AS runtime

WORKDIR /app

# Utworzenie użytkownika non-root dla bezpieczeństwa
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Kopiuj package files
COPY package*.json ./

# Instalacja tylko runtime dependencies (bez devDependencies)
RUN npm ci --only=production && \
    npm cache clean --force

# Kopiuj zbudowany frontend z buildera (tylko w production)
# W development folder dist będzie pusty, ale to nie szkodzi
ARG NODE_ENV=production
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Kopiuj pliki konfiguracyjne (potrzebne dla Vite w dev mode)
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/vite.config.ts ./
COPY --from=builder --chown=nodejs:nodejs /app/tailwind.config.js ./
COPY --from=builder --chown=nodejs:nodejs /app/postcss.config.js ./
COPY --from=builder --chown=nodejs:nodejs /app/index.html ./

# Kopiuj kod źródłowy backendu
COPY --chown=nodejs:nodejs server.js ./
COPY --chown=nodejs:nodejs src/server ./src/server

# Kopiuj publiczne pliki (CSV, obrazy, itp.)
COPY --chown=nodejs:nodejs public ./public

# Utworzenie folderów dla logów i danych
RUN mkdir -p logs public/data && \
    chown -R nodejs:nodejs logs public/data

# Przełącz na użytkownika non-root
USER nodejs

# Expose porty
# Port 5001 - Backend Express API (domyślny zgodnie z env.example i dokumentacją)
# Port 5173 - Vite Dev Server (tylko w development mode)
EXPOSE 5001 5173

# Healthcheck
# Sprawdza czy endpoint /api/health odpowiada na porcie 5001 (domyślny port aplikacji)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:5001/api/health',(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>process.exit(r.statusCode===200?0:1));r.on('error',()=>process.exit(1))})"

# Domyślny command (może być nadpisany przez docker-compose)
CMD ["node", "server.js"]

