export const PUBLIC_SITE_STUDIO_ENTER_FLAG = "pub-studio-enter";

export function markPublicSiteStudioEnter(): void {
  try {
    sessionStorage.setItem(PUBLIC_SITE_STUDIO_ENTER_FLAG, "1");
  } catch {
    /* private mode */
  }
}

export function consumePublicSiteStudioEnter(): boolean {
  try {
    if (sessionStorage.getItem(PUBLIC_SITE_STUDIO_ENTER_FLAG) !== "1") {
      return false;
    }
    sessionStorage.removeItem(PUBLIC_SITE_STUDIO_ENTER_FLAG);
    return true;
  } catch {
    return false;
  }
}
