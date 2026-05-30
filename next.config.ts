import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_SHA:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  // Suppresses source map upload logs during build
  silent: true,

  // Upload source maps for better stack traces (requires SENTRY_AUTH_TOKEN)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
