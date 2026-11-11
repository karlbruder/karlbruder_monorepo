import { init } from '@sentry/browser';

export function initSentry() {
  const dsn = process.env.REACT_APP_SENTRY_DSN?.trim();
  if (process.env.REACT_APP_SENTRY_ENABLED !== 'true' || !dsn) return;

  init({
    dsn,
    environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || undefined,
    release: process.env.REACT_APP_SENTRY_RELEASE || undefined,
    initialScope: { tags: { service: 'kb-landing' } },
    integrations: defaults => defaults.filter(integration => integration.name !== 'BrowserSession'),
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console') return null;
      for (const key of ['url', 'from', 'to']) {
        const value = breadcrumb.data?.[key];
        if (typeof value === 'string') breadcrumb.data[key] = value.split(/[?#]/, 1)[0];
      }
      return breadcrumb;
    },
    beforeSend(event) {
      if (event.request) {
        if (event.request.url) event.request.url = event.request.url.split(/[?#]/, 1)[0];
        delete event.request.query_string;
        delete event.request.headers?.Referer;
      }
      return event;
    },
  });
}
