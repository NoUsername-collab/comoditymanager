import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resolveAutoDisplayProfile,
  resolveDocumentLayout,
  resolveEffectiveLayoutChrome,
} from "../display-integration";

vi.mock("@/lib/pwa/install", () => ({
  isPwaStandaloneClient: vi.fn(() => false),
}));

import { isPwaStandaloneClient } from "@/lib/pwa/install";

const mockPwaStandalone = vi.mocked(isPwaStandaloneClient);

afterEach(() => {
  mockPwaStandalone.mockReturnValue(false);
});

describe("resolveAutoDisplayProfile", () => {
  it("uses narrow for phones in portrait and landscape", () => {
    expect(resolveAutoDisplayProfile(390, 844)).toBe("narrow");
    expect(resolveAutoDisplayProfile(844, 390)).toBe("narrow");
  });

  it("maps desktop widths to density tiers", () => {
    expect(resolveAutoDisplayProfile(1920, 1080)).toBe("wide");
    expect(resolveAutoDisplayProfile(1440, 900)).toBe("laptop");
    expect(resolveAutoDisplayProfile(1280, 800)).toBe("compact-laptop");
    expect(resolveAutoDisplayProfile(900, 700)).toBe("narrow");
  });
});

describe("resolveEffectiveLayoutChrome", () => {
  it("auto-detects compact chrome on phones", () => {
    expect(resolveEffectiveLayoutChrome("auto", 390, 844)).toBe("compact");
    expect(resolveEffectiveLayoutChrome("auto", 768, 1024)).toBe("compact");
  });

  it("forces compact when preference is narrow", () => {
    expect(resolveEffectiveLayoutChrome("narrow", 1920, 1080)).toBe("compact");
  });

  it("caps phones to compact chrome even when desktop layout is forced", () => {
    expect(resolveEffectiveLayoutChrome("wide", 390, 844)).toBe("compact");
    expect(resolveEffectiveLayoutChrome("laptop", 390, 844)).toBe("compact");
    expect(resolveEffectiveLayoutChrome("compact-laptop", 390, 844)).toBe("compact");
  });

  it("allows wide chrome for manual desktop preferences on large viewports", () => {
    expect(resolveEffectiveLayoutChrome("wide", 1440, 900)).toBe("wide");
    expect(resolveEffectiveLayoutChrome("laptop", 1280, 800)).toBe("wide");
  });
});

describe("resolveDocumentLayout", () => {
  it("aligns narrow preference with compact chrome", () => {
    const layout = resolveDocumentLayout("narrow", 1440, 900);
    expect(layout.displayProfile).toBe("narrow");
    expect(layout.chrome).toBe("compact");
    expect(layout.isManualLayout).toBe(true);
  });

  it("auto mode on phone yields narrow profile and compact chrome", () => {
    const layout = resolveDocumentLayout("auto", 390, 844);
    expect(layout.displayProfile).toBe("narrow");
    expect(layout.chrome).toBe("compact");
    expect(layout.isManualLayout).toBe(false);
  });

  it("auto mode in installed PWA forces wide profile and chrome on phone", () => {
    mockPwaStandalone.mockReturnValue(true);
    const layout = resolveDocumentLayout("auto", 390, 844);
    expect(layout.displayProfile).toBe("wide");
    expect(layout.chrome).toBe("wide");
    expect(layout.isManualLayout).toBe(true);
  });
});

describe("resolveEffectiveLayoutChrome in PWA", () => {
  it("uses wide chrome on phones when installed as PWA", () => {
    mockPwaStandalone.mockReturnValue(true);
    expect(resolveEffectiveLayoutChrome("auto", 390, 844)).toBe("wide");
  });
});
