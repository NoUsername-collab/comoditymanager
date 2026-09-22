import { describe, expect, it } from "vitest";
import {
  buildStaysPageHref,
  readStayListTab,
  readStayListView,
} from "@/domain/stays/horizon";

describe("stay list view query", () => {
  it("maps legacy Romanian query values to English views", () => {
    expect(readStayListView("cereri")).toBe("requests");
    expect(readStayListView("confirmate")).toBe("confirmed");
    expect(readStayListView("anulate")).toBe("cancelled");
    expect(readStayListView("requests")).toBe("requests");
    expect(readStayListView(undefined, "refuzate")).toBe("cancelled");
    expect(readStayListView(undefined, "refused")).toBe("cancelled");
    expect(readStayListView(undefined)).toBe("confirmed");
  });

  it("maps legacy tab= to internal StayListTab", () => {
    expect(readStayListTab("refuzate")).toBe("refused");
    expect(readStayListTab("refused")).toBe("refused");
    expect(readStayListTab("ops")).toBe("ops");
    expect(readStayListTab(undefined)).toBe("ops");
  });

  it("writes the public Romanian query, omitting the default confirmed view", () => {
    expect(buildStaysPageHref({ view: "confirmed" })).toBe("/admin/cazari");
    expect(buildStaysPageHref({ view: "requests" })).toBe(
      "/admin/cazari?view=cereri"
    );
    expect(buildStaysPageHref({ view: "cancelled", h: "7d" })).toBe(
      "/admin/cazari?h=7d&view=anulate"
    );
    expect(buildStaysPageHref({ tab: "refused" })).toBe(
      "/admin/cazari?view=anulate"
    );
  });
});
