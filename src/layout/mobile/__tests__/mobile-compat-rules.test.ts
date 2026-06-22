import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src/app");
const PROJECT_ROOT = process.cwd();

function readCss(name: string): string {
  return readFileSync(join(ROOT, name), "utf8");
}

/**
 * Static audit: critical mobile CSS rules must remain present.
 * Complements runtime tests in chrome/display-integration/resize-sync.
 */
describe("mobile compatibility CSS rules", () => {
  const guards = readCss("mobile-layout-guards.css");
  const flawless = readCss("mobile-layout-flawless.css");
  const shell = readCss("mobile-layout.css");

  it("enforces 44px touch minimum token", () => {
    expect(shell).toContain("--ml-touch-min: 2.5rem");
  });

  it("guards compact chrome overflow and safe-area scroll padding", () => {
    expect(guards).toContain('html[data-layout-chrome="compact"] .ml-content');
    expect(guards).toContain("scroll-padding-top");
    expect(guards).toContain("var(--ml-admin-nav-offset");
  });

  it("prevents iOS input zoom (16px minimum)", () => {
    expect(guards).toContain("font-size: max(16px, 1rem)");
  });

  it("disables tap highlight on interactive chrome", () => {
    expect(guards).toContain("-webkit-tap-highlight-color: transparent");
    expect(guards).toContain("touch-action: manipulation");
  });

  it("gear portal stacks above page chrome", () => {
    const globals = readFileSync(
      join(process.cwd(), "src/app/globals.css"),
      "utf8"
    );
    expect(globals).toContain(".admin-gear__dropdown--portal");
    expect(globals).toMatch(
      /\.admin-gear__dropdown--portal[\s\S]*z-index:\s*var\(--z-overlay/
    );
    expect(flawless).toMatch(
      /html\[data-layout-chrome="compact"\] \.admin-gear__dropdown--portal[\s\S]*z-index:\s*var\(--z-overlay/
    );
  });

  it("Gantt check-time dialog clears bottom nav on compact", () => {
    expect(flawless).toContain(".gantt-check-time-dialog");
    expect(flawless).toMatch(
      /html\[data-layout-chrome="compact"\] \.gantt-check-time-dialog[\s\S]*z-index:\s*calc\(var\(--z-overlay/
    );
    expect(flawless).toMatch(
      /html\[data-layout-chrome="compact"\] \.gantt-check-time-dialog__backdrop[\s\S]*z-index:\s*var\(--z-overlay/
    );
  });

  it("respects prefers-reduced-motion for nav pulse", () => {
    expect(shell).toContain("@media (prefers-reduced-motion: reduce)");
    expect(flawless).toContain("ml-nav-alert-pulse");
    expect(shell).toContain("ml-bottom-nav__link--alert");
  });

  it("hospira admin has compact table and input rules", () => {
    expect(flawless).toContain(".ml-shell--nestio-admin");
    expect(flawless).toContain(".nestio-admin-error");
  });

  it("compact chrome uses card layouts for hospira logs and tenants", () => {
    expect(flawless).toContain(".hospira-log-cards");
    expect(flawless).toContain(".hospira-log-table-desktop");
    expect(flawless).toContain(".hospira-tenant-cards");
    expect(flawless).toContain(".hospira-tenant-table-desktop");
    expect(flawless).toContain(".hospira-log-section__head");
  });

  it("cazări compact touch targets for search, ops, and load-more", () => {
    expect(flawless).toContain(".cazari-search-form");
    expect(flawless).toContain(".stay-quick-ops");
    expect(flawless).toContain(".cazari-load-more");
    expect(flawless).toContain(".stay-history-link");
  });

  it("gantt portrait has bounded scroll viewport on compact", () => {
    const ganttMobile = readCss("admin/gantt-mobile.css");
    expect(ganttMobile).toContain("[data-layout-orientation=\"portrait\"] .gantt-scroll");
    expect(flawless).toContain(
      '[data-layout-orientation="portrait"] .gantt-compact-toolbar'
    );
  });

  it("pass 12 drawer safe-area, receptie padding, public touch targets", () => {
    expect(flawless).toContain("var(--ml-safe-left");
    expect(flawless).toContain(".public-header__cta");
    expect(flawless).toContain("display: none");
    expect(flawless).toContain(".public-footer__inner");
    expect(flawless).toContain(".devlog-entry__summary");
    expect(flawless).toContain(".guest-booking-form");
  });

  it("pass 13 statistics mobile card swap", () => {
    expect(flawless).toContain(".statistics-cards");
    expect(flawless).toContain(".statistics-table-desktop");
    expect(flawless).toContain(".statistics-page .statistics-year-nav");
  });

  it("pass 15 invoice line card swap on compact", () => {
    expect(flawless).toContain(".invoice-line-cards");
    expect(flawless).toContain(".invoice-table-desktop");
    expect(flawless).toContain(".informal-invoice-print");
  });

  it("pass 16 pricing comparison cards and tenant detail compact", () => {
    expect(flawless).toContain(".pricing-comparison-cards");
    expect(flawless).toContain(".pricing-table-desktop");
    expect(flawless).toContain(".hospira-tenant-detail__info-row");
    expect(flawless).toContain(".tenant-billing-toggle");
    expect(flawless).toContain(".devlog-entry__message");
  });

  it("pass 16 guest booking form full-width CTAs on compact", () => {
    expect(flawless).toContain(".guest-booking-form .site-cta");
    expect(flawless).toContain(".guest-booking-form button");
  });

  it("PWA manifest and viewport theme for mobile app install", () => {
    expect(existsSync(join(PROJECT_ROOT, "src/app/manifest.ts"))).toBe(true);
    const manifest = readFileSync(join(PROJECT_ROOT, "src/app/manifest.ts"), "utf8");
    expect(manifest).toContain('display: "standalone"');
    expect(manifest).toContain("display_override");
    expect(manifest).toContain("prefer_related_applications");
    const layout = readFileSync(join(PROJECT_ROOT, "src/app/layout.tsx"), "utf8");
    expect(layout).toContain("viewportFit: \"cover\"");
    expect(layout).toContain("appleWebApp");
    expect(layout).toContain("themeColor");
    expect(layout).toContain("/brand/logo.svg");
  });

  it("pass 17 modal scroll lock and compact form targets", () => {
    expect(shell).toContain("admin-modal-open");
    expect(flawless).toContain(".admin-floating-panel--modal:not(.checkin-modal)");
    expect(flawless).toContain(".hospira-tenant-detail button.rounded-md");
    expect(flawless).toContain(".statistics-years-section");
  });

  it("pass 16 hospira forms, receptie checkbox, FAQ, drawer safe-area", () => {
    expect(flawless).toContain(".tenant-billing-toggle");
    expect(flawless).toContain(".nestio-tenant-option");
    expect(flawless).toContain(".hospira-dashboard__cta");
    expect(flawless).toContain(".phone-booking-form__checkbox");
    expect(flawless).toContain(".landing-faq__q");
    expect(flawless).toContain(".ml-drawer--hospira");
    expect(flawless).toContain("var(--ml-safe-bottom");
  });

  it("pass 17 drawer scroll, popover bounds, filters dock, XP body, health rows", () => {
    expect(flawless).toContain("html[data-layout-chrome=\"compact\"] .ml-drawer");
    expect(flawless).toContain("overflow-y: auto");
    expect(flawless).toContain("contain: layout style paint");
    expect(flawless).toContain(
      ".admin-floating-panel:not(.admin-floating-panel--modal)"
    );
    expect(flawless).toContain(".gantt-filters-panel.admin-floating-panel");
    expect(flawless).toContain(".admin-panel__body");
    expect(flawless).toContain(".hospira-health-row");

    const checkTime = readFileSync(
      join(process.cwd(), "src/components/admin/gantt/GanttCheckTimeDialog.tsx"),
      "utf8"
    );
    expect(checkTime).toContain("admin-modal-open");
  });

  it("pass 18 full-width modals and availability month nav", () => {
    expect(flawless).toContain("width: 100% !important");
    expect(flawless).toContain(".availability-dashboard-nav__btn");
    expect(flawless).toContain(".availability-dashboard-nav__title");
  });

  it("pass 19 date picker, language options, staff menu, legends", () => {
    expect(flawless).toContain(".availability-date-picker");
    expect(flawless).toContain(".language-switcher__option");
    expect(flawless).toContain(".admin-staff-row__role-menu");
    expect(flawless).toContain(".building-climate-legend");
    expect(flawless).toContain(".avail-heat-legend__items");
  });

  it("pass 20 domains, structure, staff invite, guest rebook", () => {
    expect(flawless).toContain(".tenant-domains-panel");
    expect(flawless).toContain(".tenant-domain-card");
    expect(flawless).toContain(".building-structure-card");
    expect(flawless).toContain(".admin-staff-invite__submit");
    expect(flawless).toContain(".guest-rebook-form__actions");
  });

  it("pass 21 home availability preview, room cards, invoice page", () => {
    expect(flawless).toContain(".availability-home-preview__arrow");
    expect(flawless).toContain(".room-dashboard-card");
    expect(flawless).toContain(".room-manage-actions");
    expect(flawless).toContain(".admin-invoice-page");
  });

  it("pass 22 room/building forms and gantt view switcher", () => {
    expect(flawless).toContain(".admin-room-form__mode");
    expect(flawless).toContain(".admin-building-form");
    expect(flawless).toContain(".gantt-view-switcher__tabs");
    expect(flawless).toContain(".gantt-view-switcher__select");
  });

  it("pass 23 color picker, add floor, building rooms, guest merge", () => {
    expect(flawless).toContain(".color-palette-picker__swatch");
    expect(flawless).toContain(".add-floor-form__trigger");
    expect(flawless).toContain(".building-rooms-collapsible__trigger");
    expect(flawless).toContain(".guest-merge-form");
    expect(flawless).toContain(".admin-settings-back");
  });

  it("pass 24 structure, location lock, delete confirm, guest notes, settings CTAs", () => {
    expect(flawless).toContain(".floor-structure-section__edit-form");
    expect(flawless).toContain(".room-structure-row__floor-select");
    expect(flawless).toContain(".admin-location-lock-bar");
    expect(flawless).toContain(".admin-location-lock-btn");
    expect(flawless).toContain(".delete-confirm-form__confirm");
    expect(flawless).toContain(".guest-notes-form__actions");
    expect(flawless).toContain(".guest-profile-controls-form__grid");
    expect(flawless).toContain(".admin-settings-location-nav");
    expect(flawless).toContain(".admin-staff-password-panel__submit");
    expect(flawless).toContain(".public-confirm-page__back");
    expect(flawless).toContain(".admin-settings-cta");
    expect(flawless).toContain(".activity-timeline__card a");
  });

  it("pass 25 availability day detail skeleton", () => {
    expect(flawless).toContain(".availability-day-detail-skeleton");
    expect(flawless).toContain(".availability-day-detail-skeleton__rows");
    expect(flawless).toContain(".availability-detail-panel__footer");
    expect(flawless).toContain("var(--ml-touch-min");
  });

  it("gantt context menu uses viewport-safe pointer positioning", () => {
    const ctxMenu = readFileSync(
      join(process.cwd(), "src/components/admin/gantt/GanttContextMenuPanel.tsx"),
      "utf8"
    );
    expect(ctxMenu).toContain("computeFixedPointerMenuPosition");
  });

  it("pass 26 availability sheet, guest rebook, identity, booking cancel", () => {
    expect(flawless).toContain(".availability-detail-panel__body");
    expect(flawless).toContain(".availability-detail-panel__cta");
    expect(flawless).toContain(".availability-detail-panel__retry");
    expect(flawless).toContain(".guest-rebook-buttons__submit");
    expect(flawless).toContain(".guest-blacklist-modal__actions");
    expect(flawless).toContain(".guest-identity-form__submit");
    expect(flawless).toContain(".booking-cancel-form__confirm");
    expect(flawless).toContain(".admin-stay-editor__save");
    expect(flawless).toContain(".receptie-page__back-site");
    expect(flawless).toContain(".bd-banner__top");
  });

  it("pass 27 UI/UX: empty states, drawer close, sticky CTAs, settings", () => {
    expect(flawless).toContain(".admin-empty-state__action");
    expect(flawless).toContain(".admin-home-avail-skeleton");
    expect(flawless).toMatch(/\.admin-empty-state__action[\s\S]*var\(--ml-touch-min/);
    expect(flawless).toContain(".admin-page-back");
    expect(flawless).toContain(".ml-drawer__close");
    expect(flawless).toContain(".avail-kpi-card__label");
    expect(flawless).toContain(".phone-booking-form__submit");
    expect(flawless).toContain(".gantt-quick-panel__footer");
    expect(flawless).toContain(".gantt-quick-panel__cancel");
    expect(flawless).toContain(".statistics-settings__select");
    expect(flawless).toContain(".admin-fx-settings__row");
    expect(flawless).toContain(".bd-confirm__header");
    expect(flawless).toContain(".bd-confirm__submit");
    expect(flawless).toContain(".bd-phone-warn__form");
    expect(flawless).toContain(".public-confirm-page__admin-link");
    expect(flawless).toContain("@media (prefers-reduced-motion: reduce)");

    const publicMenu = readFileSync(
      join(process.cwd(), "src/layout/components/PublicMobileMenu.tsx"),
      "utf8"
    );
    expect(publicMenu).toContain("ml-drawer__close");

    const confirmPage = readFileSync(
      join(process.cwd(), "src/app/[locale]/(public)/calendar/confirm/[id]/page.tsx"),
      "utf8"
    );
    expect(confirmPage).toContain("public-confirm-page__admin-link");
  });

  it("pass 28 gantt quick actions, stay review, receptie rows, language trigger", () => {
    expect(flawless).toContain(".gantt-quick-panel__actions");
    expect(flawless).toContain(".gantt-quick-panel__action");
    expect(flawless).toContain(".gantt-quick-panel--busy");
    expect(flawless).toContain(".guest-stay-review-form__note");
    expect(flawless).toContain(".guest-stay-review-form__submit");
    expect(flawless).toContain(".bd-confirm__adjust-toggle");
    expect(flawless).toContain(".admin-quick-panel__row");
    expect(flawless).toContain(".language-switcher__trigger");

    const ganttQuick = readFileSync(
      join(process.cwd(), "src/components/admin/gantt/GanttQuickActionPanel.tsx"),
      "utf8"
    );
    expect(ganttQuick).toContain("gantt-quick-panel__actions");
    expect(ganttQuick).toContain("aria-busy={pending}");

    const stayReview = readFileSync(
      join(process.cwd(), "src/components/admin/guests/GuestStayReviewForm.tsx"),
      "utf8"
    );
    expect(stayReview).toContain("guest-stay-review-form__summary");

    const heatCells = readFileSync(
      join(process.cwd(), "src/components/admin/availability/AvailabilityHeatCells.tsx"),
      "utf8"
    );
    expect(heatCells).toContain("onPointerDown");
  });

  it("admin more drawer stacks above HUD on compact", () => {
    const adminPages = readCss("mobile-layout-admin-pages.css");
    expect(adminPages).toContain(".ml-drawer__backdrop--admin");
    expect(adminPages).toMatch(/\.ml-drawer--admin[\s\S]*z-index:\s*90/);

    const moreDrawer = readFileSync(
      join(process.cwd(), "src/layout/components/AdminMobileMoreDrawer.tsx"),
      "utf8"
    );
    expect(moreDrawer).toContain("ml-drawer__backdrop--admin");
    expect(moreDrawer).toContain("MobileDrawerPortal");
  });

  it("pass 29 availability toolbar, drawer scroll, guest cards, matrix perf", () => {
    expect(flawless).toContain(".avail-dashboard-toolbar");
    expect(flawless).toContain(".avail-display-mode button");
    expect(flawless).toContain(".availability-week-nav__prev");
    expect(flawless).toContain(".avail-interval-bar__actions");
    expect(flawless).toContain(".guest-card__btn");
    expect(flawless).toContain(".availability-month-matrix");
    expect(flawless).toContain("content-visibility: auto");
    expect(flawless).toContain(".ml-drawer--admin .ml-drawer__nav");

    const availDashboard = readFileSync(
      join(process.cwd(), "src/components/admin/availability/AvailabilityDashboard.tsx"),
      "utf8"
    );
    expect(availDashboard).toContain("avail-dashboard-toolbar");
    expect(availDashboard).toContain("availability-week-nav__prev");
    expect(availDashboard).toContain("avail-interval-bar__copy");

    const moreDrawer = readFileSync(
      join(process.cwd(), "src/layout/components/AdminMobileMoreDrawer.tsx"),
      "utf8"
    );
    expect(moreDrawer).toContain("ml-drawer__close");
    expect(moreDrawer).toContain("onPointerDown");
  });
});
