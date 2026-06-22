"use server";

import { getPlatformAdminOrNull } from "@/lib/auth/require-platform-admin";
import { capturePlatformAdminError } from "@/services/dev-logs";

type NestioLogsProbeMode = "action" | "ssr";

function assertProbeAllowedInEnvironment(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[nestio-admin/logs:probe] Disabled in production.");
  }
}

async function runNestioLogsProbe(mode: NestioLogsProbeMode): Promise<never> {
  assertProbeAllowedInEnvironment();
  const session = await getPlatformAdminOrNull();
  if (!session) {
    throw new Error(
      `[nestio-admin/logs:probe${mode === "ssr" ? "-ssr" : ""}] Neautorizat — sesiune platform admin lipsă.`
    );
  }

  const probe = new Error(
    `[nestio-admin/logs:probe${mode === "ssr" ? "-ssr" : ""}] Test throw ${new Date().toISOString()} (admin=${session.email})`
  );

  await capturePlatformAdminError(probe, {
    source: mode === "ssr" ? "nestio-logs-probe-ssr" : "nestio-logs-probe",
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
export async function probeNestioLogsErrorAction(): Promise<never> {
  return runNestioLogsProbe("action");
}

/** Probe SSR — la ?throw=page pe /nestio-admin/logs. */
export async function probeNestioLogsPageThrow(): Promise<never> {
  return runNestioLogsProbe("ssr");
}
