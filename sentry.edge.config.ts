import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // "zalmox@0.9.0+af09b76": which release an error comes from (set in next.config.ts).
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.8,
  sendDefaultPii: false,
});
