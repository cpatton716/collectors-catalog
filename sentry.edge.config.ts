import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Debug mode (disable in production)
  debug: false,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",
});
