/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
    instrumentationHook: true,
  },
};

const { withSentryConfig } = (() => {
  try {
    return require("@sentry/nextjs");
  } catch {
    return { withSentryConfig: null };
  }
})();

module.exports = withSentryConfig
  ? withSentryConfig(nextConfig, {
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  : nextConfig;
