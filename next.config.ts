import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Release version (bumped by `npm run release`) and the commit being built.
// Vercel gives the commit; elsewhere (local, staging builds) git does.
const appVersion = (JSON.parse(readFileSync("./package.json", "utf8")) as { version: string })
  .version;
function buildSha(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}
const sha = buildSha();
const sentryRelease = `zalmox@${appVersion}+${sha}`;

// React needs eval() in development only (server error stacks in the browser).
// Production never uses it, so the live CSP stays without 'unsafe-eval'.
const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_BUILD_SHA: sha,
    NEXT_PUBLIC_SENTRY_RELEASE: sentryRelease,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
    experimental: {
      // The 404 for unmatched addresses: the root layout is per language.
      globalNotFound: true,
    optimizePackageImports: [
      "date-fns",
      "@supabase/supabase-js",
      "@supabase/ssr",
      "next-intl",
      "react-hook-form",
      "zod",
      "@hookform/resolvers",
      "tesseract.js",
      "mrz",
      "qrcode",
      "@sentry/nextjs",
      "@dnd-kit/core",
      "@dnd-kit/utilities",
    ],
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  // Browsers ask for /favicon.ico on their own; answer per guesthouse.
  rewrites: async () => [{ source: "/favicon.ico", destination: "/api/favicon" }],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(), geolocation=()",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            `script-src 'self' 'unsafe-inline'${devEval} https://vercel.live https://*.vercel-scripts.com https://*.sentry.io`,
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in",
            "font-src 'self' data:",
            // The public site's "where we are" map and its video section.
            "frame-src https://www.openstreetmap.org https://www.youtube-nocookie.com https://player.vimeo.com",
            "connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co https://*.sentry.io https://vercel.live",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
      ],
    },
  ],
};

export default withSentryConfig(withNextIntl(withBundleAnalyzer(nextConfig)), {
  // Suppresses source map upload logs during build
  silent: true,

  // Source maps and errors are grouped under the same release as the running build.
  release: { name: sentryRelease },

  // Upload source maps for better stack traces (requires SENTRY_AUTH_TOKEN)
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
