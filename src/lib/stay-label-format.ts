export function formatCazariLabel(
  pattern: string,
  values: Record<string, string | number>,
): string {
  let result = pattern;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{${key}}`, String(value));
  }
  return result;
}
