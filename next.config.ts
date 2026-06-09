import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_SHA:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  },
};

export default withSentryConfig(withNextIntl(withBundleAnalyzer(nextConfig)), {
  // Suppresses source map upload logs during build
  silent: true,

  // Upload source maps for better stack traces (requires SENTRY_AUTH_TOKEN)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
