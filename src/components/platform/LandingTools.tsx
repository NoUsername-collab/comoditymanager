import { getTranslations } from "next-intl/server";
import {
  LandingToolIcon,
  type LandingToolIconName,
} from "@/components/platform/LandingToolIcons";

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
      className="landing-section landing-section--tools"
      id="instrumente"
      aria-labelledby="landing-tools-title"
    >
      <h2 className="landing-section__title" id="landing-tools-title">
        {t("toolsTitle")}
      </h2>
      <p className="landing-section__lead">{t("toolsLead")}</p>
      <ul className="landing-tools" aria-label={t("toolsAria")}>
        {TOOL_IDS.map((id) => (
          <li key={id}>
            <article className="landing-tool">
              <div className="landing-tool__icon-wrap" aria-hidden>
                <LandingToolIcon name={id} className="landing-tool__icon" />
              </div>
              <h3 className="landing-tool__title">{t(`tools.${id}.title`)}</h3>
              <p className="landing-tool__desc">{t(`tools.${id}.desc`)}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
