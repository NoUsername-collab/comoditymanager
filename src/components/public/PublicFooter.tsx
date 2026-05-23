import Link from "next/link";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { getPensionSettings } from "@/services/pension-settings";

export async function PublicFooter() {
  let title = "Casa Emil";
  try {
    const s = await getPensionSettings();
    if (s?.display_name) title = s.display_name;
  } catch {
    /* fără DB */
  }

  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__grid">
          <div>
            <p className="public-footer__brand-name">{title}</p>
            <p className="public-footer__brand-desc">
              Cazare liniștită în Tasnad. Cerere online — confirmare personală
              de la pensiune, fără plată pe site.
            </p>
          </div>

          <div>
            <p className="public-footer__label">Linkuri</p>
            <nav className="public-footer__links">
              <Link href="/calendar">Cerere cazare</Link>
              <Link href="/termeni">Termeni și condiții</Link>
              <Link href="/confidentialitate">Confidențialitate (GDPR)</Link>
            </nav>
          </div>

          <div>
            <p className="public-footer__label">Contact & aspect</p>
            <p className="public-footer__contact">
              <a href="mailto:contact@casaemil.ro">contact@casaemil.ro</a>
            </p>
            <div className="public-footer__themes">
              <ThemeSwitcher />
            </div>
          </div>
        </div>

        <p className="public-footer__bottom">
          © {new Date().getFullYear()} {title} · Tasnad, România
        </p>
      </div>
    </footer>
  );
}
