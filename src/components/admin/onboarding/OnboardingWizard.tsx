"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  saveOnboardingStep1Action,
  saveOnboardingStep3Action,
} from "@/app/[locale]/admin/onboarding/actions";
import { LocaleFlagSpinner } from "@/components/ui/LocaleFlagSpinner";

const THEMES = [
  { id: "noir", labelKey: "themeNoir", swatch: "#18181b" },
  { id: "alpine", labelKey: "themeAlpine", swatch: "#0ea5e9" },
  { id: "mediterranean", labelKey: "themeMediterranean", swatch: "#0d9488" },
  { id: "pearl", labelKey: "themePearl", swatch: "#7c3aed" },
  { id: "slate", labelKey: "themeSlate", swatch: "#475569" },
  { id: "forest", labelKey: "themeForest", swatch: "#16a34a" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

type Props = {
  initialName: string;
  initialCheckIn: string;
  initialCheckOut: string;
  initialTheme: string;
  initialMode: "day" | "night";
};

export function OnboardingWizard({
  initialName,
  initialCheckIn,
  initialCheckOut,
  initialTheme,
  initialMode,
}: Props) {
  const t = useTranslations("admin.onboarding");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(
    (THEMES.find((th) => th.id === initialTheme)?.id ?? "noir") as ThemeId
  );
  const [selectedMode, setSelectedMode] = useState<"day" | "night">(initialMode);

  const steps = [t("stepProperty"), t("stepRooms"), t("stepTheme")];

  async function handleStep1(fd: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await saveOnboardingStep1Action(fd);
      if (result.ok) {
        setStep(2);
      } else {
        setError(result.error);
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }

  async function handleStep3() {
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("admin_palette_key", selectedTheme);
      fd.set("admin_day_night", selectedMode);
      const result = await saveOnboardingStep3Action(fd);
      if (result.ok) {
        router.push("/admin?onboarding=done");
      } else {
        setError(result.error);
      }
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="onboarding-wizard">
      {/* Progress stepper */}
      <div className="onboarding-stepper" role="list" aria-label="Progress">
        {steps.map((label, i) => {
          const num = i + 1;
          const done = num < step;
          const active = num === step;
          return (
            <div
              key={label}
              className={[
                "onboarding-stepper__step",
                done ? "onboarding-stepper__step--done" : "",
                active ? "onboarding-stepper__step--active" : "",
              ].join(" ")}
              role="listitem"
              aria-current={active ? "step" : undefined}
            >
              <span className="onboarding-stepper__num">
                {done ? "✓" : num}
              </span>
              <span className="onboarding-stepper__label">{label}</span>
              {i < steps.length - 1 && (
                <span className="onboarding-stepper__line" aria-hidden />
              )}
            </div>
          );
        })}
      </div>

      <div className="onboarding-card">
        {/* ── Step 1: Property basics ── */}
        {step === 1 && (
          <>
            <h2 className="onboarding-card__title">{t("step1Title")}</h2>
            <p className="onboarding-card__lead">{t("step1Lead")}</p>
            <form
              className="onboarding-card__form"
              action={async (fd) => { await handleStep1(fd); }}
            >
              <fieldset disabled={pending} className="onboarding-card__fieldset">
                <label className="onboarding-field">
                  <span className="onboarding-field__label">{t("propertyNameLabel")}</span>
                  <input
                    name="display_name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    defaultValue={initialName}
                    placeholder={t("propertyNamePlaceholder")}
                    className="onboarding-field__input"
                    autoFocus
                  />
                </label>
                <div className="onboarding-field-row">
                  <label className="onboarding-field">
                    <span className="onboarding-field__label">{t("checkInLabel")}</span>
                    <input
                      name="default_check_in_time"
                      type="time"
                      defaultValue={initialCheckIn}
                      className="onboarding-field__input"
                    />
                  </label>
                  <label className="onboarding-field">
                    <span className="onboarding-field__label">{t("checkOutLabel")}</span>
                    <input
                      name="default_check_out_time"
                      type="time"
                      defaultValue={initialCheckOut}
                      className="onboarding-field__input"
                    />
                  </label>
                </div>
                {error && <p className="onboarding-error" role="alert">{error}</p>}
                <button type="submit" disabled={pending} className="onboarding-btn onboarding-btn--primary">
                  {pending ? (
                    <><LocaleFlagSpinner label={t("saving")} size="md" /><span>{t("saving")}</span></>
                  ) : t("nextBtn")}
                </button>
              </fieldset>
            </form>
          </>
        )}

        {/* ── Step 2: Rooms ── */}
        {step === 2 && (
          <>
            <h2 className="onboarding-card__title">{t("step2Title")}</h2>
            <p className="onboarding-card__lead">{t("step2Lead")}</p>
            <div className="onboarding-rooms-actions">
              <Link href="/admin/rooms" className="onboarding-btn onboarding-btn--outline">
                {t("goToRooms")}
              </Link>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="onboarding-btn onboarding-btn--ghost"
              >
                {t("nextStep")}
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Theme ── */}
        {step === 3 && (
          <>
            <h2 className="onboarding-card__title">{t("step3Title")}</h2>
            <p className="onboarding-card__lead">{t("step3Lead")}</p>
            <div className="onboarding-themes">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setSelectedTheme(th.id)}
                  className={[
                    "onboarding-theme-btn",
                    selectedTheme === th.id ? "onboarding-theme-btn--selected" : "",
                  ].join(" ")}
                  aria-pressed={selectedTheme === th.id}
                >
                  <span
                    className="onboarding-theme-btn__swatch"
                    style={{ background: th.swatch }}
                  />
                  <span className="onboarding-theme-btn__label">{t(th.labelKey as "themeNoir")}</span>
                </button>
              ))}
            </div>
            <div className="onboarding-mode-toggle">
              {(["night", "day"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMode(m)}
                  className={[
                    "onboarding-mode-btn",
                    selectedMode === m ? "onboarding-mode-btn--selected" : "",
                  ].join(" ")}
                  aria-pressed={selectedMode === m}
                >
                  {m === "night" ? "🌙 Dark" : "☀️ Light"}
                </button>
              ))}
            </div>
            {error && <p className="onboarding-error" role="alert">{error}</p>}
            <button
              type="button"
              onClick={handleStep3}
              disabled={pending}
              className="onboarding-btn onboarding-btn--primary"
            >
              {pending ? (
                <><LocaleFlagSpinner label={t("saving")} size="md" /><span>{t("saving")}</span></>
              ) : t("finishBtn")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
