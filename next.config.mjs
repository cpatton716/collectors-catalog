import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

// Wrap with Sentry only if DSN is configured
const sentryConfig = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Suppress source map upload logs
      silent: true,

      // Upload source maps for better error tracking
      widenClientFileUpload: true,

      // Hide source maps from browsers
      hideSourceMaps: true,

      // Disable logger to reduce bundle size
      disableLogger: true,
    })
  : nextConfig;

export default sentryConfig;
