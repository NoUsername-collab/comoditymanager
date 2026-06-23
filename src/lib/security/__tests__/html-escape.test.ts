import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  safeCssUrl,
  safeEmailHref,
  safeExternalHref,
  safeNavHref,
  sanitizeEmailSubject,
} from "@/lib/security/html-escape";

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });
});

describe("safeEmailHref", () => {
  it("allows https URLs", () => {
    expect(safeEmailHref("https://example.com/path?q=1")).toBe(
      "https://example.com/path?q=1",
    );
  });

  it("blocks javascript: URLs", () => {
    expect(safeEmailHref("javascript:alert(1)")).toBe("#");
  });
});

describe("safeNavHref", () => {
  it("allows relative paths", () => {
    expect(safeNavHref("/calendar")).toBe("/calendar");
    expect(safeNavHref("#intro")).toBe("#intro");
  });

  it("blocks javascript: URLs", () => {
    expect(safeNavHref("javascript:alert(1)", "/")).toBe("/");
  });
});

describe("safeExternalHref", () => {
  it("allows https URLs", () => {
    expect(safeExternalHref("https://example.com")).toBe("https://example.com");
  });

  it("blocks javascript: URLs", () => {
    expect(safeExternalHref("javascript:alert(1)")).toBe("#");
  });
});

describe("safeCssUrl", () => {
  it("allows https URLs and blocks javascript", () => {
    const imageUrl = "https://cdn.example.com/img.jpg";
    expect(safeCssUrl(imageUrl)).toBe(imageUrl);
    expect(safeCssUrl("javascript:alert(1)")).toBe("none");
  });
});

describe("sanitizeEmailSubject", () => {
  it("strips CRLF injection characters", () => {
    expect(sanitizeEmailSubject("Hello\r\nBcc: evil@x.com")).toBe(
      "Hello Bcc: evil@x.com",
    );
  });
});
