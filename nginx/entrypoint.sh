#!/bin/sh
set -eu

mkdir -p /etc/nginx/certs

if [ ! -f /etc/nginx/certs/origin.crt ] || [ ! -f /etc/nginx/certs/origin.key ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout /etc/nginx/certs/origin.key \
    -out /etc/nginx/certs/origin.crt \
    -subj "/CN=app.karlbruder.com"
fi

exec nginx -g "daemon off;"
