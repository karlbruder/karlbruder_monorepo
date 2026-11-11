import * as Sentry from "@sentry/react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn().mockResolvedValue({ statusCode: 200 }) }));

vi.mock("@sentry/react", async (importOriginal) => {
  const sdk = await importOriginal<typeof Sentry>();
  return {
    ...sdk,
    init: vi.fn((options: Parameters<typeof sdk.init>[0]) => sdk.init({
      ...options,
      transport: () => ({
        send,
        flush: async () => true,
      }),
    })),
  };
});

afterEach(async () => {
  cleanup();
  await Sentry.getReplay()?.stop();
  await Sentry.close();
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.mocked(Sentry.init).mockClear();
  send.mockClear();
  window.history.replaceState({}, "", "/");
});

function enableMonitoring() {
  vi.stubEnv("VITE_SENTRY_ENABLED", "true");
  vi.stubEnv("VITE_SENTRY_DSN", "https://public@example.invalid/1");
  vi.stubEnv("VITE_SENTRY_ENVIRONMENT", "test");
  vi.stubEnv("VITE_SENTRY_RELEASE", "example-sha");
}

it("starts without a Sentry client when monitoring is disabled or the DSN is missing", async () => {
  enableMonitoring();
  vi.stubEnv("VITE_SENTRY_ENABLED", "false");
  await import("@/integrations/sentry/instrument.client");
  vi.stubEnv("VITE_SENTRY_ENABLED", "true");
  vi.stubEnv("VITE_SENTRY_DSN", "");
  vi.resetModules();
  await import("@/integrations/sentry/instrument.client");
  expect(Sentry.init).not.toHaveBeenCalled();
});

it("captures errors with the configured release and enables sampled Replay", async () => {
  enableMonitoring();
  vi.stubEnv("VITE_SENTRY_TRACES_SAMPLE_RATE", "0.2");
  vi.stubEnv("VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE", "0.3");
  await import("@/integrations/sentry/instrument.client");
  Sentry.captureException(new Error("browser error"));
  await Sentry.flush();

  const items = send.mock.calls.flatMap(([[, envelopeItems]]) => envelopeItems);
  expect(items).toContainEqual([
    expect.objectContaining({ type: "event" }),
    expect.objectContaining({
      environment: "test",
      release: "example-sha",
      tags: expect.objectContaining({ service: "kb-frontend" }),
      exception: expect.objectContaining({
        values: expect.arrayContaining([expect.objectContaining({ value: "browser error" })]),
      }),
    }),
  ]);
  expect(Sentry.getClient()?.getOptions()).toMatchObject({
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.3,
    replaysOnErrorSampleRate: 1,
  });
  expect(Sentry.getClient()?.getIntegrationByName("Replay")).toBeDefined();
});

it("skips monitoring on a Supabase callback URL containing credentials", async () => {
  enableMonitoring();
  window.history.replaceState({}, "", "/account/new-password?code=synthetic-code#access_token=synthetic-token");
  await import("@/integrations/sentry/instrument.client");
  expect(Sentry.init).not.toHaveBeenCalled();
});

it("traces browser navigation using the matched React Router route", async () => {
  enableMonitoring();
  vi.stubEnv("VITE_SENTRY_TRACES_SAMPLE_RATE", "1");
  await import("@/integrations/sentry/instrument.client");
  const TracedRoutes = Sentry.wrapReactRouterRouting(Routes);

  render(
    <BrowserRouter>
      <Link to="/events/42">Event</Link>
      <TracedRoutes>
        <Route path="/" element={<p>Home</p>} />
        <Route path="/events/:eventId" element={<p>Event page</p>} />
      </TracedRoutes>
    </BrowserRouter>,
  );
  fireEvent.click(screen.getByRole("link", { name: "Event" }));
  expect(screen.getByText("Event page")).toBeInTheDocument();
  const span = Sentry.getActiveSpan();
  expect(span && Sentry.spanToJSON(span).name).toBe("/events/:eventId");
  span?.end();
});
