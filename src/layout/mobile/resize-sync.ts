import { debounce } from "@/lib/debounce";
import { DISPLAY_LAYOUT_CHANGED_EVENT } from "@/lib/ui/display-layout-preference";
import type { DisplayLayoutPreference } from "@/lib/ui/display-layout-preference";
import {
  applyDocumentLayout,
  isDocumentLayoutBootstrapped,
} from "./apply-document-layout";
import { LAYOUT_RESIZE_DEBOUNCE_MS } from "./viewport";

export { LAYOUT_RESIZE_DEBOUNCE_MS };

export type LayoutViewportSubscriptionOptions = {
  debounceMs?: number;
  /** Run sync immediately on preference change (boot-script storage handler). */
  immediateOnPreferenceChange?: boolean;
};

const listeners = new Set<() => void>();
let subscriberCount = 0;
let teardownWindowListeners: (() => void) | null = null;

function notifyListeners() {
  for (const listener of listeners) listener();
}

function syncLayout(preference?: DisplayLayoutPreference) {
  applyDocumentLayout(preference);
  notifyListeners();
}

function ensureWindowListeners(
  ms: number,
  immediateOnPreferenceChange: boolean
) {
  if (teardownWindowListeners) return;

  const debouncedSync = debounce(() => syncLayout(), ms);
  const onPreferenceChange = immediateOnPreferenceChange
    ? () => syncLayout()
    : debouncedSync;

  window.addEventListener("resize", debouncedSync);
  window.addEventListener("orientationchange", debouncedSync);
  window.visualViewport?.addEventListener("resize", debouncedSync);
  window.addEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, onPreferenceChange);

  teardownWindowListeners = () => {
    window.removeEventListener("resize", debouncedSync);
    window.removeEventListener("orientationchange", debouncedSync);
    window.visualViewport?.removeEventListener("resize", debouncedSync);
    window.removeEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, onPreferenceChange);
  };
}

/**
 * Shared viewport listener — debounced resize/visualViewport, immediate preference changes.
 * Used by MobileLayoutGuard (DOM) and useMobileLayout (React state).
 */
export function subscribeLayoutViewportChanges(
  onChange?: () => void,
  options: LayoutViewportSubscriptionOptions = {}
): () => void {
  const ms = options.debounceMs ?? LAYOUT_RESIZE_DEBOUNCE_MS;
  const immediateOnPreferenceChange = options.immediateOnPreferenceChange ?? true;

  if (onChange) listeners.add(onChange);
  subscriberCount += 1;
  ensureWindowListeners(ms, immediateOnPreferenceChange);

  if (isDocumentLayoutBootstrapped()) {
    notifyListeners();
  } else {
    syncLayout();
  }

  return () => {
    if (onChange) listeners.delete(onChange);
    subscriberCount -= 1;
    if (subscriberCount <= 0 && teardownWindowListeners) {
      teardownWindowListeners();
      teardownWindowListeners = null;
      subscriberCount = 0;
    }
  };
}
