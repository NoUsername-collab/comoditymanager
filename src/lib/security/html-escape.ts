/** Escape dynamic strings embedded in HTML email bodies. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape values used in HTML attributes (e.g. href). */
export function escapeHtmlAttr(value: string): string {
  return escapeHtml(value);
}

/** Prevent SMTP header injection in subject lines. */
export function sanitizeEmailSubject(value: string): string {
  return value.replace(/[\r\n]/g, " ").replace(/\s+/g, " ").trim();
}

/** Allow only http(s) links in email CTAs. */
export function safeEmailHref(href: string): string {
  const trimmed = href.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "#";
  return escapeHtmlAttr(trimmed);
}

/** True when href is http(s) only — blocks javascript:, data:, protocol-relative //. */
export function isSafeHttpUrl(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

/** True for http(s), same-origin relative (/…), or in-page anchors (#…). */
export function isSafeNavHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("#")) return true;
  return false;
}

/** Sanitize navigation hrefs (Link / <a>) — returns fallback when unsafe. */
export function safeNavHref(href: string | null | undefined, fallback = "#"): string {
  if (!href) return fallback;
  return isSafeNavHref(href) ? href.trim() : fallback;
}

/** Sanitize external links (http(s), mailto, tel). */
export function safeExternalHref(href: string): string {
  const trimmed = href.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^mailto:/i.test(trimmed) && !trimmed.includes("\n")) return trimmed;
  if (/^tel:/i.test(trimmed) && !/[\s<>]/.test(trimmed.slice(4))) return trimmed;
  return "#";
}

/** Sanitize URLs embedded in CSS url() — http(s) only, escapes breakout chars. */
export function safeCssUrl(url: string | null | undefined): string {
  if (!url) return "none";
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return "none";
  return trimmed.replace(/["'()\\]/g, (ch) => encodeURIComponent(ch));
}
