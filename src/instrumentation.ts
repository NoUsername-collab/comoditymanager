export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertServerEnvAtBoot } = await import("@/lib/env/server");
    assertServerEnvAtBoot();
    await import("../sentry.server.config");

    const { registerTenantProcessErrorHandlers } = await import(
      "@/lib/tenant/error-safeguard"
    );
    registerTenantProcessErrorHandlers();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = async (
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) => {
  const [error, request, context] = args;

  try {
    const rawHost =
      request.headers["x-forwarded-host"] ?? request.headers["host"] ?? null;
    const host = Array.isArray(rawHost) ? rawHost[0] ?? null : rawHost;

    const { isTenantRequestHost, shouldSkipTenantErrorLog } = await import(
      "@/lib/tenant/error-safeguard"
    );

    if (
      isTenantRequestHost(host) &&
      !shouldSkipTenantErrorLog(error)
    ) {
      const { captureTenantError } = await import("@/services/dev-logs");
      const digest =
        typeof error === "object" &&
        error !== null &&
        "digest" in error &&
        typeof (error as { digest?: unknown }).digest === "string"
          ? (error as { digest: string }).digest
          : undefined;

      await captureTenantError(error, {
        source: "request",
        requestPath: request.path,
        requestMethod: request.method,
        requestHost: host,
        context: {
          routePath: context.routePath,
          routeType: context.routeType,
          routerKind: context.routerKind,
          digest,
        },
      });
    }
  } catch (logErr) {
    console.error("[instrumentation] tenant error log failed:", logErr);
  }

  const { captureRequestError } = await import("@sentry/nextjs");
  captureRequestError(...args);
};
