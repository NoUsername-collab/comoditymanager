"use server";

import { getPlatformAdminOrNull } from "@/lib/auth/require-platform-admin";
import { capturePlatformAdminError } from "@/services/dev-logs";

type HospiraLogsProbeMode = "action" | "ssr";

async function runHospiraLogsProbe(mode: HospiraLogsProbeMode): Promise<never> {
  const session = await getPlatformAdminOrNull();
  if (!session) {
    throw new Error(
      `[hospira-admin/logs:probe${mode === "ssr" ? "-ssr" : ""}] Neautorizat — sesiune platform admin lipsă.`
    );
  }

  const probe = new Error(
    `[hospira-admin/logs:probe${mode === "ssr" ? "-ssr" : ""}] Test throw ${new Date().toISOString()} (admin=${session.email})`
  );

  await capturePlatformAdminError(probe, {
    source: mode === "ssr" ? "hospira-logs-probe-ssr" : "hospira-logs-probe",
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
export async function probeHospiraLogsErrorAction(): Promise<never> {
  return runHospiraLogsProbe("action");
}

/** Probe SSR — la ?throw=page pe /hospira-admin/logs. */
export async function probeHospiraLogsPageThrow(): Promise<never> {
  return runHospiraLogsProbe("ssr");
}
