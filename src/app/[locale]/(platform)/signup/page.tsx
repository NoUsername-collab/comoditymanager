import { getTranslations } from "next-intl/server";
import { SignupForm } from "@/features/signup/ui/SignupForm";
import { Link } from "@/i18n/navigation";

export default async function SignupPage() {
  const t = await getTranslations("signup");

  return (
    <main className="signup-page">
      <div className="signup-container">
        {/* Left: Benefits */}
        <div className="signup-benefits">
          <h1 className="signup-benefits__title">{t("heroTitle")}</h1>
          <p className="signup-benefits__subtitle">{t("heroSubtitle")}</p>

          <ul className="signup-benefits__list">
            <li className="signup-benefits__item">
              <span className="signup-benefits__icon">&#10003;</span>
              <span>
                <strong>{t("benefit1Title")}</strong>
                <br />
                <span className="signup-benefits__desc">{t("benefit1Desc")}</span>
              </span>
            </li>
            <li className="signup-benefits__item">
              <span className="signup-benefits__icon">&#10003;</span>
              <span>
                <strong>{t("benefit2Title")}</strong>
                <br />
                <span className="signup-benefits__desc">{t("benefit2Desc")}</span>
              </span>
            </li>
            <li className="signup-benefits__item">
              <span className="signup-benefits__icon">&#10003;</span>
              <span>
                <strong>{t("benefit3Title")}</strong>
                <br />
                <span className="signup-benefits__desc">{t("benefit3Desc")}</span>
              </span>
            </li>
            <li className="signup-benefits__item">
              <span className="signup-benefits__icon">&#10003;</span>
              <span>
                <strong>{t("benefit4Title")}</strong>
                <br />
                <span className="signup-benefits__desc">{t("benefit4Desc")}</span>
              </span>
            </li>
          </ul>

          <p className="signup-benefits__cta">{t("noCreditCard")}</p>
        </div>

        {/* Right: Form */}
        <div className="signup-form-wrapper">
          <h2 className="signup-form-wrapper__title">{t("formTitle")}</h2>
          <SignupForm />
        </div>
      </div>
    </main>
  );
}
