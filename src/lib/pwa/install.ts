/** PWA install helpers — pure, testable (no window in unit tests). */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function isPwaInstalledInBrowser(
  matchStandalone: (query: string) => boolean,
  iosStandalone: boolean
): boolean {
  return (
    matchStandalone("(display-mode: standalone)") ||
    matchStandalone("(display-mode: fullscreen)") ||
    iosStandalone
  );
}

export function isIosSafariUserAgent(userAgent: string): boolean {
  const isIos = /iPhone|iPad|iPod/i.test(userAgent);
  const isSafari =
    /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
  return isIos && isSafari;
}

export function isMobileInstallUserAgent(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
}

export function readPwaInstallContext(): {
  installed: boolean;
  isIosSafari: boolean;
  isMobile: boolean;
} {
  if (typeof window === "undefined") {
    return { installed: false, isIosSafari: false, isMobile: false };
  }

  const nav = window.navigator as Navigator & { standalone?: boolean };
  const installed = isPwaInstalledInBrowser(
    (q) => window.matchMedia(q).matches,
    nav.standalone === true
  );

  return {
    installed,
    isIosSafari: isIosSafariUserAgent(nav.userAgent),
    isMobile: isMobileInstallUserAgent(nav.userAgent),
  };
}
