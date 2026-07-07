"use server";

import { getPlatformAdminWithMfaOrNull } from "@/lib/auth/require-platform-admin";
import { capturePlatformAdminError } from "@/services/dev-logs";

type PlatformLogsProbeMode = "action" | "ssr";

function assertProbeAllowedInEnvironment(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[platform-admin/logs:probe] Disabled in production.");
  }
}

async function runPlatformLogsProbe(mode: PlatformLogsProbeMode): Promise<never> {
  assertProbeAllowedInEnvironment();
  const session = await getPlatformAdminWithMfaOrNull();
  if (!session) {
    throw new Error(
      `[platform-admin/logs:probe${mode === "ssr" ? "-ssr" : ""}] Neautorizat — sesiune platform admin lipsă.`
    );
  }

  const probe = new Error(
    `[platform-admin/logs:probe${mode === "ssr" ? "-ssr" : ""}] Test throw ${new Date().toISOString()} (admin=${session.email})`
  );

  await capturePlatformAdminError(probe, {
    source: mode === "ssr" ? "platform-logs-probe-ssr" : "platform-logs-probe",
    userId: session.userId,
    userEmail: session.email,
    context: {
      probe: true,
      mode,
    },
  });

  throw probe;
}

/** Probe client (server action) — scrie dev_logs apoi throw. */
export async function probePlatformLogsErrorAction(): Promise<never> {
  return runPlatformLogsProbe("action");
}

/** Probe SSR — la ?throw=page pe /platform-admin/logs. */
export async function probePlatformLogsPageThrow(): Promise<never> {
  return runPlatformLogsProbe("ssr");
}
