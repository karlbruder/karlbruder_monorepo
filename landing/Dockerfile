# syntax=docker/dockerfile:1

# -----------
# Development
# -----------
FROM node:20-alpine AS development

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV HOST=::
ENV PORT=3000
ENV BROWSER=none

EXPOSE 3000

CMD ["npm", "start"]

# -------
# Builder
# -------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

# ----------
# Production
# ----------
# Local preview of the static bundle. compose.prod.yml does not run this image.
# Production publishes the same build output to S3.
FROM nginx:1.27-alpine AS production

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
