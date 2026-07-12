import { getPlatformAdminWithMfaOrNull } from "@/lib/auth/require-platform-admin";
import { isPlatformAdminDbError } from "@/lib/platform-admin/format-db-error";
import { capturePlatformAdminError } from "@/services/dev-logs";

export type PlatformActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export function platformActionFailure(
  error: unknown,
  fallback = "Operațiunea a eșuat."
): PlatformActionResult<never> {
  if (error instanceof Error) {
    return { success: false, error: error.message || fallback };
  }
  return { success: false, error: fallback };
}

/** Guard + handler — never throws to the client. */
export async function runPlatformAdminAction<T>(
  handler: (session: { userId: string; email: string }) => Promise<T>,
  fallbackError = "Operațiunea a eșuat."
): Promise<PlatformActionResult<T>> {
  let session: { userId: string; email: string } | null = null;
  try {
    session = await getPlatformAdminWithMfaOrNull();
    if (!session) {
      return { success: false, error: "Neautorizat." };
    }
    const data = await handler(session);
    return { success: true, data };
  } catch (error) {
    console.error("[platform-admin-action]", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...(isPlatformAdminDbError(error)
        ? {
            context: error.context,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }
        : {}),
    });

    try {
      await capturePlatformAdminError(error, {
        source: "platform-action",
        userId: session?.userId,
        userEmail: session?.email,
      });
    } catch (logError) {
      console.error("[platform-admin-action] dev_log write failed:", logError);
    }

    return platformActionFailure(error, fallbackError);
  }
}
