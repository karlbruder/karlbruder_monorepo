#!/bin/sh
set -eu

if [ -z "${LANDING_HOSTNAMES:-}" ] || [ -z "${APPLICATION_HOSTNAMES:-}" ]; then
  echo "LANDING_HOSTNAMES and APPLICATION_HOSTNAMES are required." >&2
  exit 1
fi

mkdir -p /etc/nginx/certs

if [ ! -f /etc/nginx/certs/origin.crt ] || [ ! -f /etc/nginx/certs/origin.key ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout /etc/nginx/certs/origin.key \
    -out /etc/nginx/certs/origin.crt \
    -subj "/CN=origin"
fi

envsubst '${LANDING_HOSTNAMES} ${APPLICATION_HOSTNAMES}' \
  < /etc/nginx/nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
