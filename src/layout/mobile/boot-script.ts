/**
 * Inline boot script — display preference + mobile layout before first paint.
 * Injected in root layout via DEVICE_BOOT_SCRIPT.
 */

const BOOT_SCRIPT_SOURCE = `
(function () {
  try {
    var ua = navigator.userAgent || "";
    var d = "desktop";
    if (/Android/i.test(ua)) d = "android";
    else if (/iPhone|iPod|iPad/i.test(ua)) d = "ios";
    else if (/Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) d = "mobile";

    var r = document.documentElement;
    r.setAttribute("data-device", d);
    if (d !== "desktop") r.classList.add("touch-device");

    var SK = "hospira-display-layout";

    function isPwa() {
      try {
        return (
          window.matchMedia("(display-mode: standalone)").matches ||
          window.matchMedia("(display-mode: fullscreen)").matches ||
          window.navigator.standalone === true
        );
      } catch (e) {
        return false;
      }
    }

    function readStoredPref() {
      try {
        var p = localStorage.getItem(SK);
        if (p === "auto") return "auto";
        if (
          p === "wide" ||
          p === "laptop" ||
          p === "compact-laptop" ||
          p === "narrow"
        ) {
          return p;
        }
      } catch (e) {}
      return "auto";
    }

    function effectivePref(stored) {
      if (isPwa() && stored === "auto") return "wide";
      return stored;
    }

    function vp() {
      var vv = window.visualViewport;
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (vv) {
        w = Math.round(vv.width);
        h = Math.round(vv.height);
      }
      return { w: w, h: h };
    }

    function autoProfile(w, h) {
      var s = Math.min(w, h);
      if (s < 640) return "narrow";
      if (w >= 1680) return "wide";
      if (w >= 1400) return "laptop";
      if (w >= 1024) return "compact-laptop";
      return "narrow";
    }

    function layoutMode(w, h) {
      var s = Math.min(w, h);
      if (s < 640) return "mobile";
      if (w < 1024) return "tablet";
      return "desktop";
    }

    function layoutOri(w, h) {
      return w >= h ? "landscape" : "portrait";
    }

    function autoChrome(w, h, m, o) {
      if (m === "mobile") return "compact";
      if (m === "tablet") return "compact";
      return "wide";
    }

    function effectiveChrome(pref, w, h, m, o) {
      var s = Math.min(w, h);
      if (s < 640) {
        if (pref === "narrow") return "compact";
        if (isPwa() && pref !== "narrow") return "wide";
        return "compact";
      }
      if (pref === "narrow") return "compact";
      if (pref !== "auto") return "wide";
      return autoChrome(w, h, m, o);
    }

    function layoutBp(w) {
      if (w >= 1536) return "2xl";
      if (w >= 1280) return "xl";
      if (w >= 1024) return "lg";
      if (w >= 768) return "md";
      return "sm";
    }

    function apply(v) {
      var w = v.w;
      var h = v.h;
      var stored = readStoredPref();
      var pref = effectivePref(stored);
      var m = layoutMode(w, h);
      var o = layoutOri(w, h);
      var prof = pref === "auto" ? autoProfile(w, h) : pref;
      var chrome = effectiveChrome(pref, w, h, m, o);
      var ht = h >= 820 ? "tall" : h >= 680 ? "standard" : "short";
      var bp = layoutBp(w);

      r.setAttribute("data-display-profile", prof);
      r.setAttribute("data-viewport-height", ht);
      r.setAttribute(
        "data-display-layout-mode",
        stored === "auto" && !isPwa() ? "auto" : "manual"
      );
      r.setAttribute("data-layout-preference", stored);
      r.setAttribute("data-layout-mode", m);
      r.setAttribute("data-layout-orientation", o);
      r.setAttribute("data-layout-chrome", chrome);
      r.setAttribute("data-layout-bp", bp);
      r.style.setProperty("--ml-vvw", w + "px");
      r.style.setProperty("--ml-vvh", h + "px");

      var cv = prof === "compact-laptop" || prof === "narrow";
      if (cv) r.classList.add("compact-viewport");
      else r.classList.remove("compact-viewport");

      r.classList.toggle("layout-mobile", m === "mobile");
      r.classList.toggle("layout-tablet", m === "tablet");
      r.classList.toggle("layout-desktop", m === "desktop");
      r.classList.toggle("layout-portrait", o === "portrait");
      r.classList.toggle("layout-landscape", o === "landscape");
      r.classList.toggle("layout-chrome-compact", chrome === "compact");
      r.classList.toggle("layout-chrome-wide", chrome === "wide");
      r.classList.toggle("layout-pref-narrow", stored === "narrow");
      r.classList.toggle(
        "layout-pref-desktop",
        stored !== "auto" && stored !== "narrow"
      );
      document.body.classList.toggle("ml-overflow-guard", chrome === "compact");
    }

    function profile() {
      apply(vp());
    }

    profile();

    var t;
    function schedule() {
      clearTimeout(t);
      t = setTimeout(profile, 80);
    }

    function bindListeners() {
      window.addEventListener("resize", schedule);
      window.addEventListener("orientationchange", schedule);
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", schedule);
        window.visualViewport.addEventListener("scroll", schedule);
      }
      window.addEventListener("storage", function (e) {
        if (e.key === SK) profile();
      });
    }

    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(bindListeners, { timeout: 1500 });
    } else {
      bindListeners();
    }
  } catch (e) {}
})();
`.trim();

function minifyInlineBootScript(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, "");
}

export const MOBILE_LAYOUT_BOOT_SCRIPT = minifyInlineBootScript(BOOT_SCRIPT_SOURCE);
