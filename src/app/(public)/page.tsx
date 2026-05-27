import Link from "next/link";
import { PublicStaffPreview } from "@/components/public/PublicStaffPreview";
import { getAdminUser } from "@/lib/auth/require-admin";
import { loadAdminDashboard } from "@/services/admin-dashboard";
import { getPensionSettings } from "@/services/pension-settings";

export default async function HomePage() {
  let title = "Casa Emil";
  let checkIn = "14:00";
  let checkOut = "11:00";
  let staffPreview: Awaited<ReturnType<typeof loadAdminDashboard>> | null = null;

  try {
    const s = await getPensionSettings();
    if (s) {
      title = s.display_name;
      checkIn = s.default_check_in_time;
      checkOut = s.default_check_out_time;
    }
  } catch {
    /* dev fără DB */
  }

  try {
    const staffUser = await getAdminUser();
    if (staffUser) {
      staffPreview = await loadAdminDashboard();
    }
  } catch {
    staffPreview = null;
  }

  return (
    <main className="flex flex-1 flex-col">
      <section className="public-hero">
        <div className="public-hero__glow" aria-hidden />
        <div className="public-hero__inner">
          <p className="public-hero__badge">Tasnad · cazare pensiune</p>
          <h1 className="public-hero__title">{title}</h1>
          <p className="public-hero__subtitle">
            Cazare liniștită pentru familie și concediu scurt. Alegi datele online,
            primești răspuns personal de la recepție — fără plată automată, fără surprize.
          </p>
          <p className="public-hero__tagline">
            Cald, simplu, ca acasă — exact cum promite numele.
          </p>
          <p className="public-hero__meta">
            Check-in de la {checkIn} · Check-out până la {checkOut}
          </p>
          <div className="public-hero__actions">
            <Link href="/calendar" className="site-cta">
              Cere disponibilitate
            </Link>
            <Link href="/#cum-functioneaza" className="site-cta site-cta--ghost">
              Cum funcționează
            </Link>
          </div>
        </div>
      </section>

      {staffPreview && <PublicStaffPreview data={staffPreview} />}

      <section className="public-section">
        <h2 className="public-section__title">De ce e simplu</h2>
        <p className="public-section__lead">
          Trei lucruri clare — fără surprize la plată online.
        </p>
        <div className="public-features">
          {[
            {
              icon: "🛏",
              h: "Camere confortabile",
              p: "Opțiuni cu sau fără aer condiționat, potrivite pentru familii.",
            },
            {
              icon: "📅",
              h: "Cerere în câteva minute",
              p: "Alegi perioada, vezi variante și preț estimat, apoi trimiți datele.",
            },
            {
              icon: "🤝",
              h: "Confirmare de la pensiune",
              p: "Rezervarea devine fermă doar după ce vă contactăm. Fără plată online.",
            },
          ].map((item) => (
            <article key={item.h} className="public-feature-card">
              <div className="public-feature-card__icon" aria-hidden>
                {item.icon}
              </div>
              <h3 className="public-feature-card__title">{item.h}</h3>
              <p className="public-feature-card__text">{item.p}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section" id="cum-functioneaza">
        <h2 className="public-section__title">Pașii rezervării</h2>
        <p className="public-section__lead">
          De la cerere la sejur confirmat — transparent pentru oaspeți.
        </p>
        <div className="public-steps">
          {[
            {
              n: "1",
              h: "Alegi perioada",
              p: "Completezi datele, număr persoane și vezi variantele disponibile.",
            },
            {
              n: "2",
              h: "Reținem provizoriu",
              p: "Camerele din varianta aleasă sunt blocate temporar până la răspuns.",
            },
            {
              n: "3",
              h: "Confirmăm noi",
              p: "Vă contactăm cu prețul final și detaliile check-in / check-out.",
            },
          ].map((step) => (
            <article key={step.n} className="public-step">
              <span className="public-step__num">{step.n}</span>
              <h3 className="public-step__title">{step.h}</h3>
              <p className="public-step__text">{step.p}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-cta-band">
        <h2 className="public-cta-band__title">Gata să trimiți o cerere?</h2>
        <p className="public-cta-band__text">
          Durează câteva minute. Dacă perioada nu e liberă, îți spunem imediat —
          fără cont și fără card.
        </p>
        <Link href="/calendar" className="site-cta">
          Deschide calendarul
        </Link>
      </section>
    </main>
  );
}