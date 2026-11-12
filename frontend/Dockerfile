# syntax=docker/dockerfile:1

# -----------
# Development
# -----------
FROM node:20-alpine AS development

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "::", "--port", "5173"]

# -------
# Builder
# -------
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG ENV_NAME
ARG GIT_SHA
ARG RELEASED_AT
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENABLED
ARG VITE_SUPABASE_URL
ENV VITE_ENV_NAME=${ENV_NAME}
ENV VITE_GIT_SHA=${GIT_SHA}
ENV VITE_RELEASED_AT=${RELEASED_AT}
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ENV VITE_SENTRY_ENABLED=${VITE_SENTRY_ENABLED}

RUN --mount=type=secret,id=VITE_SUPABASE_PUBLISHABLE_KEY,env=VITE_SUPABASE_PUBLISHABLE_KEY,required=true npm run build

# ----------
# Production
# ----------
FROM nginx:1.27-alpine AS production

ARG ENV_NAME
ARG GIT_SHA=NaN
ARG RELEASED_AT=unknown
ENV ENV_NAME=${ENV_NAME}
ENV GIT_SHA=${GIT_SHA}
ENV RELEASED_AT=${RELEASED_AT}

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
