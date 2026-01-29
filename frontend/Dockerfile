# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Copia dependências
COPY package.json package-lock.json ./
RUN npm ci

# Copia o código
COPY . .

# Build de produção
RUN npm run build

# ---------- Production stage ----------
FROM nginx:1.25-alpine

# Remove config padrão
RUN rm /etc/nginx/conf.d/default.conf

# Config SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia build do Vite
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
