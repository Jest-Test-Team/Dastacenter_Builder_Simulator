declare module '@sentry/browser' {
  export interface SentryBrowserOptions {
    dsn?: string;
    tracesSampleRate?: number;
    replaysSessionSampleRate?: number;
    replaysOnErrorSampleRate?: number;
  }
  export function init(options: SentryBrowserOptions): void;
  export function captureException(err: unknown): void;
  export function captureMessage(msg: string, level?: string): void;
  const Sentry: { init: typeof init; captureException: typeof captureException; captureMessage: typeof captureMessage };
  export default Sentry;
}
