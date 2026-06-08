import { captureTenantError } from "@/services/dev-logs";

/**
 * Wrapper pentru server actions — captează erori automat în dev_logs.
 * Utilizare:
 *
 * ```ts
 * export const myAction = withDevLog("myAction", async (formData: FormData) => {
 *   // logica acțiunii
 * });
 * ```
 */
export function withDevLog<T extends (...args: unknown[]) => Promise<unknown>>(
  actionName: string,
  fn: T
): T {
  const wrapped = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const start = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - start;

      // Log slow actions (>3s)
      if (duration > 3000) {
        const { captureSlowQuery } = await import("@/services/dev-logs");
        await captureSlowQuery(
          `action:${actionName}`,
          duration,
          3000,
          { source: "action" }
        );
      }

      return result as ReturnType<T>;
    } catch (error) {
      await captureTenantError(error, {
        source: "action",
        context: { actionName },
      });
      throw error;
    }
  };
  return wrapped as T;
}
