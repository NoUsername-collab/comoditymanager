import type { PostgrestError } from "@supabase/supabase-js";

type DbErrorShape = Pick<PostgrestError, "message" | "code" | "details" | "hint">;

export function formatDbError(context: string, error: DbErrorShape): string {
  const parts = [
    `[${context}] ${error.message}`,
    error.code ? `code=${error.code}` : null,
    error.details ? `details=${error.details}` : null,
    error.hint ? `hint=${error.hint}` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.join(" | ");
}

export class PlatformAdminDbError extends Error {
  readonly context: string;
  readonly code?: string;
  readonly details?: string;
  readonly hint?: string;

  constructor(context: string, error: DbErrorShape) {
    super(formatDbError(context, error));
    this.name = "PlatformAdminDbError";
    this.context = context;
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
  }
}

export function throwIfDbError(
  context: string,
  error: PostgrestError | null
): void {
  if (error) {
    throw new PlatformAdminDbError(context, error);
  }
}

/** Works across RSC → client error boundaries where instanceof breaks. */
export function isPlatformAdminDbError(
  error: unknown
): error is PlatformAdminDbError {
  if (error instanceof PlatformAdminDbError) return true;
  return error instanceof Error && error.name === "PlatformAdminDbError";
}
