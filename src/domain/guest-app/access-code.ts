/** Codes are base64url (letters, digits, "-" and "_"); anything else is not a code. */
const ACCESS_CODE_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

/**
 * Exact values to look a guest code up by: as typed and lower-cased (newer codes are
 * lower-case). Never a LIKE pattern — "%" or "_" there would match other guests' codes.
 */
export function accessCodeCandidates(raw: string): string[] | null {
  const code = raw.trim();
  if (!ACCESS_CODE_PATTERN.test(code)) return null;
  return [...new Set([code, code.toLowerCase()])];
}
