FROM nginx:1.27-alpine AS production

RUN apk add --no-cache openssl curl \
    && rm /etc/nginx/conf.d/default.conf

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY maintenance.png /usr/share/nginx/html/maintenance.png
COPY maintenance.html /usr/share/nginx/html/maintenance.html
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
