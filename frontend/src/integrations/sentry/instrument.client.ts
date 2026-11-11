import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

const env = import.meta.env;
const dsn = env.VITE_SENTRY_DSN;

// Sentry can include the starting URL, including Supabase callback credentials.
const authCallback = /(?:^|[?#&])(?:code|token_hash|access_token|refresh_token)=/.test(
  window.location.search + window.location.hash,
);

if (env.VITE_SENTRY_ENABLED === "true" && dsn && !authCallback) {
  Sentry.init({
    dsn,
    environment: env.VITE_SENTRY_ENVIRONMENT || undefined,
    release: env.VITE_SENTRY_RELEASE || undefined,
    initialScope: { tags: { service: "kb-frontend" } },
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    integrations: [
      Sentry.reactRouterBrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        beforeAddRecordingEvent(event) {
          if (event.data.tag === "performanceSpan") {
            // Replay records URLs for direct uploads, which can have signed query strings.
            const span = event.data.payload;
            span.description = span.description.split(/[?#]/, 1)[0];
          }
          return event;
        },
      }),
    ],
    tracesSampleRate: Number(env.VITE_SENTRY_TRACES_SAMPLE_RATE || 0.1),
    tracePropagationTargets: [],
    replaysSessionSampleRate: Number(env.VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE || 0.1),
    replaysOnErrorSampleRate: 1,
  });
}
