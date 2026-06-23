import type {
  FiscalSubmissionStatus,
  FiscalSubmitResult,
} from "./fiscal-provider";

export const TERMINAL_FISCAL_STATUSES: readonly FiscalSubmissionStatus[] = [
  "accepted",
  "rejected",
  "failed",
] as const;

export const ACTIVE_FISCAL_STATUSES: readonly FiscalSubmissionStatus[] = [
  "pending",
  "submitted",
] as const;

export function buildIdempotencyKey(tenantId: string, invoiceId: string): string {
  return `fiscal:${tenantId}:${invoiceId}`;
}

export function buildPayloadHash(payload: unknown): string {
  const normalized = stableStringify(payload);
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function isTerminalFiscalStatus(status: FiscalSubmissionStatus): boolean {
  return TERMINAL_FISCAL_STATUSES.includes(status);
}

export function canSubmitFiscalJob(status: FiscalSubmissionStatus): boolean {
  return status === "pending";
}

export function canPollFiscalJob(status: FiscalSubmissionStatus): boolean {
  return status === "submitted";
}

export function canTransitionFiscalStatus(
  from: FiscalSubmissionStatus,
  to: FiscalSubmissionStatus
): boolean {
  if (from === to) return true;
  const allowed: Record<FiscalSubmissionStatus, FiscalSubmissionStatus[]> = {
    pending: ["submitted", "accepted", "failed"],
    submitted: ["accepted", "rejected", "failed"],
    accepted: [],
    rejected: [],
    failed: ["pending"],
  };
  return allowed[from].includes(to);
}

export function resolveStatusAfterSubmit(
  result: FiscalSubmitResult
): FiscalSubmissionStatus {
  if (
    result.status === "submitted" ||
    result.status === "accepted" ||
    result.status === "rejected" ||
    result.status === "failed"
  ) {
    return result.status;
  }
  return "failed";
}

export function computeRetryBackoffMs(attemptCount: number): number {
  const baseMs = 60_000;
  const maxMs = 15 * 60_000;
  const exponent = Math.max(0, attemptCount - 1);
  return Math.min(maxMs, baseMs * 2 ** exponent);
}

export function isFiscalRetryEligible(input: {
  status: FiscalSubmissionStatus;
  attemptCount: number;
  maxAttempts: number;
  updatedAt: string | Date;
  now?: Date;
}): boolean {
  if (input.status !== "failed") return false;
  if (input.attemptCount >= input.maxAttempts) return false;
  const updatedAt =
    input.updatedAt instanceof Date
      ? input.updatedAt.getTime()
      : new Date(input.updatedAt).getTime();
  const now = (input.now ?? new Date()).getTime();
  return now - updatedAt >= computeRetryBackoffMs(input.attemptCount);
}

export function hasActiveFiscalJob(status: FiscalSubmissionStatus): boolean {
  return ACTIVE_FISCAL_STATUSES.includes(status);
}
