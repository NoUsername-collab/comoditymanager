import { describe, expect, it } from "vitest";
import { parseRichText, safeRichHref } from "@/features/public-site/domain/rich-text";
import { videoEmbedUrl } from "@/features/public-site/domain/video";

describe("rich text", () => {
  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    expect(parseRichText("Prima linie\na doua\n\nAl doilea paragraf")).toEqual([
      {
        kind: "paragraph",
        content: [
          { kind: "text", text: "Prima linie" },
          { kind: "break" },
          { kind: "text", text: "a doua" },
        ],
      },
      { kind: "paragraph", content: [{ kind: "text", text: "Al doilea paragraf" }] },
    ]);
  });

  it("reads bold, links and lists", () => {
    const [intro, list] = parseRichText(
      "Check-in **după 14:00**, vezi [regulile](/termeni).\n- Wi-Fi\n- Parcare",
    );
    expect(intro).toEqual({
      kind: "paragraph",
      content: [
        { kind: "text", text: "Check-in " },
        { kind: "bold", text: "după 14:00" },
        { kind: "text", text: ", vezi " },
        { kind: "link", text: "regulile", href: "/termeni", external: false },
        { kind: "text", text: "." },
      ],
    });
    expect(list).toEqual({
      kind: "list",
      items: [[{ kind: "text", text: "Wi-Fi" }], [{ kind: "text", text: "Parcare" }]],
    });
  });

  it("never links to a script or another protocol", () => {
    expect(safeRichHref("javascript:alert(1)")).toBeNull();
    expect(safeRichHref("//evil.example")).toBeNull();
    expect(parseRichText("[click](javascript:alert(1))")[0]).toEqual({
      kind: "paragraph",
      content: [{ kind: "text", text: "[click](javascript:alert(1)" }, { kind: "text", text: ")" }],
    });
    expect(safeRichHref("https://maps.google.com")).toEqual({
      href: "https://maps.google.com",
      external: true,
    });
    expect(safeRichHref("tel:+40712345678")?.external).toBe(false);
  });
});

describe("video addresses", () => {
  it("embeds YouTube from its no-cookie domain, in its usual forms", () => {
    const embed = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ";
    expect(videoEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(embed);
    expect(videoEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(embed);
    expect(videoEmbedUrl("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe(embed);
  });

  it("embeds Vimeo and refuses anything else", () => {
    expect(videoEmbedUrl("https://vimeo.com/76979871")).toBe("https://player.vimeo.com/video/76979871");
    expect(videoEmbedUrl("https://example.com/film.mp4")).toBeNull();
    expect(videoEmbedUrl("not a url")).toBeNull();
    expect(videoEmbedUrl("")).toBeNull();
  });
});
