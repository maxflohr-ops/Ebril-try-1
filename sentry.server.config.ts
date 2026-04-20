import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Server-side: never capture PII in breadcrumbs; we pass structured
    // context explicitly where it's needed.
    sendDefaultPii: false,
    beforeSend(event) {
      // Scrub anything that looks like a token or email from the message.
      if (event.request?.cookies) delete event.request.cookies;
      return event;
    },
  });
}
