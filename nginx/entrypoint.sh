#!/bin/sh
set -eu

if [ -z "${LANDING_SERVER_NAMES:-}" ] || [ -z "${APP_SERVER_NAMES:-}" ]; then
  echo "LANDING_SERVER_NAMES and APP_SERVER_NAMES are required." >&2
  exit 1
fi

mkdir -p /etc/nginx/certs

if [ ! -f /etc/nginx/certs/origin.crt ] || [ ! -f /etc/nginx/certs/origin.key ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout /etc/nginx/certs/origin.key \
    -out /etc/nginx/certs/origin.crt \
    -subj "/CN=origin"
fi

envsubst '${LANDING_SERVER_NAMES} ${APP_SERVER_NAMES}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
