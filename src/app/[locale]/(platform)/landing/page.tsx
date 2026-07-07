import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { LandingHeroShowcase } from "@/components/platform/LandingHeroShowcase";
import { LandingTools } from "@/components/platform/LandingTools";
import { LandingTrustCards } from "@/components/platform/LandingTrustCards";
import { PricingGrid } from "@/components/platform/PricingGrid";
import {
  BookingFormMockup,
  GuestAppMockup,
  DashboardMockup,
} from "@/components/platform/LandingMockups";
import { PLATFORM_CONTACT_EMAIL } from "@/lib/platform/branding";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-static";
export const revalidate = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function LandingPage() {
  const [t, tp] = await Promise.all([
    getTranslations("landing"),
    getTranslations("pricing"),
  ]);

  const demoHref = `mailto:${PLATFORM_CONTACT_EMAIL}?subject=${encodeURIComponent(t("demoEmailSubject"))}`;

  return (
    <main className="lp">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="lp-hero" aria-labelledby="lp-hero-title">
        <div className="lp-hero__glow" aria-hidden />
        <div className="lp-hero__grid">

          {/* Left: copy */}
          <div className="lp-hero__copy">
            <span className="lp-badge lp-badge--rainbow">{t("heroBadge")}</span>
            <h1 className="lp-hero__title" id="lp-hero-title">
              {t("heroTitle")}
            </h1>
            <p className="lp-hero__subtitle">{t("heroSubtitle")}</p>

            <div className="lp-hero__actions">
              <Link href="/signup" className="lp-btn lp-btn--primary lp-btn--lg">
                {t("heroCta")}
              </Link>
              <a href={demoHref} className="lp-btn lp-btn--ghost lp-btn--lg">
                {t("heroCtaDemo")}
              </a>
            </div>

            <p className="lp-hero__note">
              ✓ Fără card · ✓ Setup 30 secunde · ✓ 0% comision
            </p>

            {/* Stats */}
            <div className="lp-stats-inline">
              <div className="lp-stat-inline">
                <span className="lp-stat-inline__value">0 EUR</span>
                <span className="lp-stat-inline__label">Pentru start</span>
              </div>
              <div className="lp-stat-inline__divider" />
              <div className="lp-stat-inline">
                <span className="lp-stat-inline__value">30s</span>
                <span className="lp-stat-inline__label">Setup cont</span>
              </div>
              <div className="lp-stat-inline__divider" />
              <div className="lp-stat-inline">
                <span className="lp-stat-inline__value">0%</span>
                <span className="lp-stat-inline__label">Comision</span>
              </div>
            </div>

            {/* Social proof quote */}
            <figure className="lp-quote">
              <blockquote>
                <p>{t("heroSocialQuote")}</p>
              </blockquote>
              <figcaption>{t("heroSocialCaption")}</figcaption>
            </figure>
          </div>

          {/* Right: browser mockup */}
          <div className="lp-hero__visual">
            <LandingHeroShowcase />
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ───────────────────────────────────────────── */}
      <section className="lp-trust-strip" aria-label="Pensiuni care folosesc Zalmox">
        <p className="lp-trust-strip__lead">Folosit de pensiuni din</p>
        <div className="lp-trust-strip__flags">
          <span className="lp-flag-chip">🇷🇴 România</span>
          <span className="lp-flag-chip">🇲🇩 Moldova</span>
          <span className="lp-flag-chip">🇧🇬 Bulgaria</span>
        </div>
        <div className="lp-trust-strip__badges">
          <span className="lp-trust-badge">✓ GDPR Conform</span>
          <span className="lp-trust-badge">✓ e-Factura ANAF</span>
          <span className="lp-trust-badge">✓ SSL / Multi-tenant</span>
          <span className="lp-trust-badge">✓ Uptime 99.9%</span>
        </div>
      </section>

      {/* ── FEATURE 1 — Gantt Calendar ────────────────────────────── */}
      <section className="lp-feat-section">
        <div className="lp-feat-section__inner lp-feat-section__inner--left">
          <div className="lp-feat-section__copy">
            <span className="lp-badge lp-badge--violet">📅 Calendar Gantt</span>
            <h2 className="lp-feat-section__title">
              Toate rezervările dintr-o privire
            </h2>
            <p className="lp-feat-section__desc">
              Calendar Gantt vizual cu drag & drop. Vezi ocuparea pe săptămâni, luni sau an întreg.
              Zero dublă rezervare — blocaj automat în timp real.
            </p>
            <ul className="lp-feat-list">
              <li>Vizualizare săptămânală și lunară</li>
              <li>Sync automat cu Booking.com și Airbnb (iCal)</li>
              <li>Drag & drop pentru mutare rezervări</li>
              <li>Heatmap disponibilitate cu un click</li>
            </ul>
            <Link href="/signup" className="lp-btn lp-btn--primary">
              Încearcă gratuit
            </Link>
          </div>
          <div className="lp-feat-section__visual">
            <LandingHeroShowcase />
          </div>
        </div>
      </section>

      {/* ── FEATURE 2 — Online Booking ────────────────────────────── */}
      <section className="lp-feat-section lp-feat-section--alt">
        <div className="lp-feat-section__inner lp-feat-section__inner--right">
          <div className="lp-feat-section__visual">
            <BookingFormMockup />
          </div>
          <div className="lp-feat-section__copy">
            <span className="lp-badge lp-badge--pink">🏠 Rezervări Online</span>
            <h2 className="lp-feat-section__title">
              Pagina ta de rezervări, în 30 de secunde
            </h2>
            <p className="lp-feat-section__desc">
              Fiecare pensiune primește automat o pagină publică de prezentare și un formular de
              rezervare direct, fără comision.
            </p>
            <ul className="lp-feat-list">
              <li>Pagina de prezentare inclusă în toate planurile</li>
              <li>Formular de rezervare cu confirmare automată</li>
              <li>Gestionare cereri direct din panou</li>
              <li>Link personalizat (ex: pensiunea-ta.zalmox.app)</li>
            </ul>
            <Link href="/signup" className="lp-btn lp-btn--primary">
              Creează cont gratuit
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURE 3 — Guest App ─────────────────────────────────── */}
      <section className="lp-feat-section lp-feat-section--dark">
        <div className="lp-feat-section__inner lp-feat-section__inner--left">
          <div className="lp-feat-section__copy">
            <span className="lp-badge lp-badge--teal">📱 Guest App</span>
            <h2 className="lp-feat-section__title" style={{ color: "#f1f5f9" }}>
              O experiență digitală pentru oaspeți
            </h2>
            <p className="lp-feat-section__desc" style={{ color: "#94a3b8" }}>
              Fiecare rezervare generează un link personal pentru oaspeți. Check-in online,
              Wi-Fi instant, informații despre unitate și facilitați — direct pe telefon.
            </p>
            <ul className="lp-feat-list lp-feat-list--dark">
              <li>Check-in online înainte de sosire</li>
              <li>Parolă Wi-Fi cu un tap</li>
              <li>Ghid local și facilități</li>
              <li>Notificări email automate incluse</li>
            </ul>
            <Link href="/signup" className="lp-btn lp-btn--primary">
              Încearcă gratuit
            </Link>
          </div>
          <div className="lp-feat-section__visual lp-feat-section__visual--centered">
            <GuestAppMockup />
          </div>
        </div>
      </section>

      {/* ── FEATURE 4 — Dashboard & Rapoarte ─────────────────────── */}
      <section className="lp-feat-section">
        <div className="lp-feat-section__inner lp-feat-section__inner--right">
          <div className="lp-feat-section__visual">
            <DashboardMockup />
          </div>
          <div className="lp-feat-section__copy">
            <span className="lp-badge lp-badge--amber">📊 Rapoarte & Statistici</span>
            <h2 className="lp-feat-section__title">
              Decizii bazate pe date, nu pe estimări
            </h2>
            <p className="lp-feat-section__desc">
              Dashboard în timp real cu ocupare, venituri, rezervări și tendințe.
              Export CSV, rapoarte lunare și integrare e-Factura ANAF.
            </p>
            <ul className="lp-feat-list">
              <li>Ocupare în timp real pe cameră și perioadă</li>
              <li>Venituri nete și comparații lunare</li>
              <li>Facturare automată + e-Factura ANAF</li>
              <li>Export Excel/CSV pentru contabil</li>
            </ul>
            <Link href="/signup" className="lp-btn lp-btn--primary">
              Vezi demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── ALL TOOLS GRID ────────────────────────────────────────── */}
      <LandingTools />

      {/* ── BIG STATS ─────────────────────────────────────────────── */}
      <section className="lp-stats-section" aria-label="Cifre cheie">
        <div className="lp-stats-section__inner">
          <h2 className="lp-stats-section__title">
            De ce aleg proprietarii Zalmox
          </h2>
          <div className="lp-big-stats">
            {[
              { value: "5", unit: "camere", label: "incluse gratuit permanent" },
              { value: "30s", unit: "", label: "setup cont nou" },
              { value: "0%", unit: "", label: "comision la rezervări directe" },
              { value: "99.9%", unit: "", label: "uptime garantat Business" },
            ].map((s) => (
              <div key={s.label} className="lp-big-stat">
                <div className="lp-big-stat__num">
                  <span className="lp-big-stat__value">{s.value}</span>
                  {s.unit && <span className="lp-big-stat__unit">{s.unit}</span>}
                </div>
                <p className="lp-big-stat__label">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="lp-steps-section" aria-labelledby="lp-how-title">
        <h2 className="lp-section-title" id="lp-how-title">{t("howTitle")}</h2>
        <p className="lp-section-lead">{t("howLead")}</p>
        <ol className="lp-steps">
          {[
            { num: "01", icon: "⚡", title: t("step1Title"), desc: t("step1Desc") },
            { num: "02", icon: "🏠", title: t("step2Title"), desc: t("step2Desc") },
            { num: "03", icon: "📅", title: t("step3Title"), desc: t("step3Desc") },
          ].map((s) => (
            <li key={s.num} className="lp-step">
              <div className="lp-step__num">{s.num}</div>
              <div className="lp-step__icon">{s.icon}</div>
              <h3 className="lp-step__title">{s.title}</h3>
              <p className="lp-step__desc">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────── */}
      <section className="lp-testimonials" aria-label="Testimoniale">
        <h2 className="lp-section-title">Ce spun proprietarii</h2>
        <p className="lp-section-lead">Pensiuni reale, experiențe reale.</p>
        <div className="lp-testimonials__grid">
          {[
            {
              quote: "Am trecut de la un caiet fizic la Zalmox în o zi. Acum știu exact ce camere sunt libere fără să mai sun recepția.",
              name: "Maria D.",
              role: "Proprietar, Pensiunea Flori de Munte · Sinaia",
              stars: 5,
            },
            {
              quote: "Cel mai util lucru a fost că Booking.com și Airbnb se sincronizează singure. Nu mai am dublă rezervare de 8 luni.",
              name: "Ion P.",
              role: "Administrator, Casa Verde · Sibiu",
              stars: 5,
            },
            {
              quote: "Facturarea automată mi-a salvat zeci de ore pe lună. Contabilul meu e și el fericit — exportul e perfect.",
              name: "Elena M.",
              role: "Proprietar, Vila Brașovului · Brașov",
              stars: 5,
            },
          ].map((t) => (
            <article key={t.name} className="lp-testimonial">
              <div className="lp-testimonial__stars">
                {"★".repeat(t.stars)}
              </div>
              <blockquote className="lp-testimonial__quote">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <footer className="lp-testimonial__footer">
                <div className="lp-testimonial__avatar">
                  {t.name[0]}
                </div>
                <div>
                  <p className="lp-testimonial__name">{t.name}</p>
                  <p className="lp-testimonial__role">{t.role}</p>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </section>

      {/* ── PROBLEM vs SOLUTION ───────────────────────────────────── */}
      <section className="lp-compare-section" aria-labelledby="lp-problem-title">
        <h2 className="lp-section-title" id="lp-problem-title">{t("problemTitle")}</h2>
        <div className="lp-compare">
          <div className="lp-compare__col lp-compare__col--bad">
            <div className="lp-compare__col-header">
              <span className="lp-compare__icon">😓</span>
              <h3>{t("withoutZalmox")}</h3>
            </div>
            <ul>
              <li>{t("problem1")}</li>
              <li>{t("problem2")}</li>
              <li>{t("problem3")}</li>
              <li>{t("problem4")}</li>
            </ul>
          </div>
          <div className="lp-compare__col lp-compare__col--good">
            <div className="lp-compare__col-header">
              <span className="lp-compare__icon">⚡</span>
              <h3>{t("withZalmox")}</h3>
            </div>
            <ul>
              <li>{t("solution1")}</li>
              <li>{t("solution2")}</li>
              <li>{t("solution3")}</li>
              <li>{t("solution4")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────── */}
      <section className="lp-pricing-section" id="preturi" aria-labelledby="lp-pricing-title">
        <h2 className="lp-section-title" id="lp-pricing-title">{tp("gridTitle")}</h2>
        <p className="lp-section-lead">{tp("gridLead")}</p>
        <PricingGrid featuredPlan="professional" />
        <p className="landing-pricing-note">{tp("vatNote")}</p>
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Link href="/preturi" className="lp-btn lp-btn--ghost">
            Compară toate planurile →
          </Link>
        </div>
      </section>

      {/* ── TRUST CARDS ───────────────────────────────────────────── */}
      <LandingTrustCards />

      {/* ── FAQ ───────────────────────────────────────────────────── */}
      <section className="lp-faq-section" aria-labelledby="lp-faq-title">
        <h2 className="lp-section-title" id="lp-faq-title">{tp("faqTitle")}</h2>
        <div className="landing-faq lp-faq">
          {[1, 2, 3, 4].map((i) => (
            <details key={i} className="landing-faq__item">
              <summary className="landing-faq__q">{tp(`faq${i}Q`)}</summary>
              <p className="landing-faq__a">{tp(`faq${i}A`)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section className="lp-final-cta" aria-labelledby="lp-final-title">
        <div className="lp-final-cta__glow" aria-hidden />
        <div className="lp-final-cta__inner">
          <h2 className="lp-final-cta__title" id="lp-final-title">
            {t("finalCtaTitle")}
          </h2>
          <p className="lp-final-cta__text">{t("finalCtaText")}</p>
          <div className="lp-final-cta__actions">
            <Link href="/signup" className="lp-btn lp-btn--primary lp-btn--lg lp-btn--glow">
              {t("finalCtaButton")}
            </Link>
            <a href={demoHref} className="lp-btn lp-btn--ghost-light lp-btn--lg">
              {t("heroCtaDemo")}
            </a>
          </div>
          <p className="lp-final-cta__note">
            ✓ Fără card de credit · ✓ Anulezi oricând · ✓ 5 camere gratuit permanent
          </p>
        </div>
      </section>

    </main>
  );
}
