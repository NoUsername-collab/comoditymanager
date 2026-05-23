import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { PublicNav } from "./PublicNav";
import { StaffLogoEntry } from "./StaffLogoEntry";
import { getPensionSettings } from "@/services/pension-settings";

export async function PublicHeader() {
  let title = "Casa Emil";
  const subtitle = "Pensiune · Tasnad";

  try {
    const s = await getPensionSettings();
    if (s?.display_name) title = s.display_name;
  } catch {
    /* fără DB */
  }

  return (
    <header className="public-header">
      <div className="public-header__inner">
        <StaffLogoEntry>
          <Link href="/" className="public-header__brand group">
            <BrandLogo animated />
            <div className="min-w-0 leading-tight">
              <span className="public-header__name">{title}</span>
              <span className="public-header__tag">{subtitle}</span>
            </div>
          </Link>
        </StaffLogoEntry>
        <PublicNav />
      </div>
    </header>
  );
}
