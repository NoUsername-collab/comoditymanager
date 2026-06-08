import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DISPLAY_LAYOUT_CHANGED_EVENT } from "@/lib/ui/display-layout-preference";
import { LAYOUT_RESIZE_DEBOUNCE_MS } from "../viewport";
import { subscribeLayoutViewportChanges } from "../resize-sync";

function createWindowStub() {
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

  return {
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: Event) {
      listeners.get(event.type)?.forEach((listener) => {
        if (typeof listener === "function") {
          listener(event);
        } else {
          listener.handleEvent(event);
        }
      });
      return true;
    },
    visualViewport: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  };
}

describe("LAYOUT_RESIZE_DEBOUNCE_MS", () => {
  it("matches boot-script 80ms debounce", () => {
    expect(LAYOUT_RESIZE_DEBOUNCE_MS).toBe(80);
  });
});

describe("subscribeLayoutViewportChanges", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", createWindowStub());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("runs sync on subscribe and debounces resize", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeLayoutViewportChanges(onChange);

    expect(onChange).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event("resize"));
    expect(onChange).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(LAYOUT_RESIZE_DEBOUNCE_MS);
    expect(onChange).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it("notifies without re-applying when boot script already set layout attrs", () => {
    const root = {
      getAttribute: vi.fn(),
      setAttribute: vi.fn(),
      hasAttribute: vi.fn((name: string) =>
        name === "data-layout-mode" || name === "data-layout-chrome"
      ),
      style: {
        getPropertyValue: vi.fn((prop: string) =>
          prop === "--ml-vvw" ? "390px" : ""
        ),
        setProperty: vi.fn(),
      },
      classList: { toggle: vi.fn() },
    };
    vi.stubGlobal("document", {
      documentElement: root,
      body: { classList: { toggle: vi.fn() } },
    });

    const onChange = vi.fn();
    const unsubscribe = subscribeLayoutViewportChanges(onChange);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(root.setAttribute).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("runs sync immediately on display layout preference change", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeLayoutViewportChanges(onChange);
    onChange.mockClear();

    window.dispatchEvent(new Event(DISPLAY_LAYOUT_CHANGED_EVENT));
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
