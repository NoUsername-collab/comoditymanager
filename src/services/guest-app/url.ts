/** Construiește URL absolut către guest app. */
export function buildGuestAppStayUrl(
  baseUrl: string,
  accessCode: string,
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/stay/${accessCode}`;
}
