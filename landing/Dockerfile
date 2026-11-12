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

ARG ENV_NAME
ARG GIT_SHA
ARG RELEASED_AT
ARG REACT_APP_SENTRY_DSN
ARG REACT_APP_SENTRY_ENABLED
ARG REACT_APP_APPLICATION_URL
ENV REACT_APP_ENV_NAME=${ENV_NAME}
ENV REACT_APP_GIT_SHA=${GIT_SHA}
ENV REACT_APP_RELEASED_AT=${RELEASED_AT}
ENV REACT_APP_APPLICATION_URL=$REACT_APP_APPLICATION_URL
ENV REACT_APP_SENTRY_DSN=${REACT_APP_SENTRY_DSN}
ENV REACT_APP_SENTRY_ENABLED=${REACT_APP_SENTRY_ENABLED}

RUN npm run build

# ----------
# Production
# ----------
# Serves the static bundle on port 80. The edge Nginx container routes the public host here.
FROM nginx:1.27-alpine AS production

ARG ENV_NAME
ARG GIT_SHA=NaN
ARG RELEASED_AT=unknown
ENV ENV_NAME=${ENV_NAME}
ENV GIT_SHA=${GIT_SHA}
ENV RELEASED_AT=${RELEASED_AT}

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
