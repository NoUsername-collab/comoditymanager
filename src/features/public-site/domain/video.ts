/**
 * A video address an operator pastes (YouTube or Vimeo, in any of the usual
 * forms) turned into the player to embed. YouTube plays from its no-cookie
 * domain, so visitors are not tracked until they press play.
 */
export function videoEmbedUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

  const youtubeId = (() => {
    if (host === "youtu.be") return url.pathname.slice(1);
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v") ?? "";
      const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
      return match?.[1] ?? "";
    }
    return null;
  })();
  if (youtubeId !== null) {
    return /^[\w-]{6,20}$/.test(youtubeId) ? `https://www.youtube-nocookie.com/embed/${youtubeId}` : null;
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = url.pathname.match(/(\d{5,12})/)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null;
}
