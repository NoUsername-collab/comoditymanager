/**
 * Which build is running: the release version from package.json and the commit
 * it was built from. Both are set at build time in next.config.ts, so the same
 * values reach the server, the browser, health checks, backups and Sentry.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
export const BUILD_SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev";

/** "v0.9.0 · af09b76", for the admin and support conversations. */
export function versionLabel(): string {
  return `v${APP_VERSION} · ${BUILD_SHA}`;
}
