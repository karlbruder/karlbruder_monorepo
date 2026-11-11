import * as Sentry from '@sentry/browser';
import { initSentry } from './sentry';

const mockSend = jest.fn();

jest.mock('@sentry/browser', () => ({
  ...jest.requireActual('@sentry/browser'),
  init: jest.fn(),
}));

const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    REACT_APP_SENTRY_ENABLED: 'true',
    REACT_APP_SENTRY_DSN: 'https://public@example.invalid/1',
    REACT_APP_SENTRY_ENVIRONMENT: 'test',
    REACT_APP_SENTRY_RELEASE: 'example-sha',
  };
  const { init } = jest.requireActual('@sentry/browser');
  Sentry.init.mockImplementation(options => init({
    ...options,
    transport: () => ({ send: mockSend, flush: async () => true }),
  }));
  mockSend.mockResolvedValue({ statusCode: 200 });
});

afterEach(async () => {
  await Sentry.close();
  process.env = originalEnv;
  jest.clearAllMocks();
});

test('leaves monitoring disabled without explicit opt-in and a DSN', () => {
  process.env.REACT_APP_SENTRY_ENABLED = 'false';
  initSentry();
  process.env.REACT_APP_SENTRY_ENABLED = 'true';
  delete process.env.REACT_APP_SENTRY_DSN;
  initSentry();
  expect(Sentry.init).not.toHaveBeenCalled();
});

test('captures landing errors without traces or Replay', async () => {
  initSentry();
  Sentry.captureException(new Error('landing error'));
  Sentry.startSpan({ name: 'landing trace', forceTransaction: true }, () => {});
  await Sentry.flush();

  const items = mockSend.mock.calls.flatMap(([[, envelopeItems]]) => envelopeItems);
  expect(items).toEqual([[
    expect.objectContaining({ type: 'event' }),
    expect.objectContaining({
      environment: 'test',
      release: 'example-sha',
      tags: expect.objectContaining({ service: 'kb-landing' }),
      exception: expect.objectContaining({
        values: expect.arrayContaining([expect.objectContaining({ value: 'landing error' })]),
      }),
    }),
  ]]);
  expect(Sentry.getClient().getIntegrationByName('Replay')).toBeUndefined();
});
