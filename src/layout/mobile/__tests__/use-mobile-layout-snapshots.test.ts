import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isDocumentLayoutBootstrapped } from "../apply-document-layout";
import {
  readLayoutChromeFromDom,
  readLayoutModeFromDom,
  readLayoutOrientationFromDom,
} from "../dom";

function createMockRoot(attrs: Record<string, string> = {}, vvw = "") {
  const attributes = new Map(Object.entries(attrs));
  return {
    hasAttribute(name: string) {
      return attributes.has(name);
    },
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
    removeAttribute(name: string) {
      attributes.delete(name);
    },
    style: {
      getPropertyValue(name: string) {
        return name === "--ml-vvw" ? vvw : "";
      },
      setProperty(name: string, value: string) {
        if (name === "--ml-vvw") vvw = value;
      },
      removeProperty() {},
    },
  };
}

describe("useMobileLayout server snapshots", () => {
  beforeEach(() => {
    vi.stubGlobal("document", { documentElement: createMockRoot() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads DOM attrs when layout is bootstrapped", () => {
    const root = createMockRoot(
      {
        "data-layout-mode": "mobile",
        "data-layout-chrome": "compact",
        "data-layout-orientation": "portrait",
      },
      "390px"
    );
    vi.stubGlobal("document", { documentElement: root });

    expect(isDocumentLayoutBootstrapped()).toBe(true);
    expect(readLayoutModeFromDom()).toBe("mobile");
    expect(readLayoutChromeFromDom()).toBe("compact");
    expect(readLayoutOrientationFromDom()).toBe("portrait");
  });

  it("isDocumentLayoutBootstrapped is false without boot attrs", () => {
    expect(isDocumentLayoutBootstrapped()).toBe(false);
  });
});

describe("useMobileLayout snapshot helpers (source audit)", () => {
  const source = readFileSync(
    join(process.cwd(), "src/hooks/useMobileLayout.ts"),
    "utf8"
  );

  it("uses bootstrapped DOM for useSyncExternalStore server snapshots", () => {
    expect(source).toContain("isDocumentLayoutBootstrapped");
    expect(source).toContain("getCompactLayoutHintsSnapshot");
    expect(source).toContain("getMobileLayoutStateSnapshot");
    expect(source).toMatch(
      /getCompactLayoutHintsSnapshot[\s\S]*isDocumentLayoutBootstrapped[\s\S]*readCompactLayoutHints/
    );
    expect(source).toMatch(
      /getMobileLayoutStateSnapshot[\s\S]*isDocumentLayoutBootstrapped[\s\S]*readMobileLayoutState/
    );
    expect(source).toMatch(
      /useSyncExternalStore\([\s\S]*getCompactLayoutHintsSnapshot/
    );
    expect(source).toMatch(
      /useSyncExternalStore\([\s\S]*getMobileLayoutStateSnapshot/
    );
  });
});
