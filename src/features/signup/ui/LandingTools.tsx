import { getTranslations } from "next-intl/server";
import {
  LandingToolIcon,
  type LandingToolIconName,
} from "@/features/signup/ui/LandingToolIcons";

const TOOL_IDS: LandingToolIconName[] = [
  "gantt",
  "cazari",
  "checkin",
  "guestApp",
  "disponibilitate",
  "fiscal",
  "buildings",
  "publicSite",
];

export async function LandingTools() {
  const t = await getTranslations("landing");

  return (
    <section
      className="lp-section lp-section--tools"
      id="instrumente"
      aria-labelledby="landing-tools-title"
    >
      <h2 className="lp-section__title" id="landing-tools-title">
        {t("toolsTitle")}
      </h2>
      <p className="lp-section__lead">{t("toolsLead")}</p>
      <ul className="lp-tools" aria-label={t("toolsAria")}>
        {TOOL_IDS.map((id) => (
          <li key={id}>
            <article className="lp-tool">
              <div className="lp-tool__icon-wrap" aria-hidden>
                <LandingToolIcon name={id} className="lp-tool__icon" />
              </div>
              <h3 className="lp-tool__title">{t(`tools.${id}.title`)}</h3>
              <p className="lp-tool__desc">{t(`tools.${id}.desc`)}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
