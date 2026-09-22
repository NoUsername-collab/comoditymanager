import en from "../../../../messages/en.json";
import ro from "../../../../messages/ro.json";
import bg from "../../../../messages/bg.json";
import { localizedFromTriad } from "@/features/public-site/domain/localized";
import type { LocalizedText } from "@/features/public-site/domain/types";

type HomeMessages = typeof en.public.home;

function triad(pick: (home: HomeMessages) => string): LocalizedText {
  return localizedFromTriad({
    en: pick(en.public.home),
    ro: pick(ro.public.home),
    bg: pick(bg.public.home),
  });
}

export function seedPublicHomeCopy() {
  return {
    heroBadge: triad((h) => h.badge),
    heroSubtitle: triad((h) => h.subtitle),
    heroTagline: triad((h) => h.tagline),
    ctaPrimary: triad((h) => h.ctaBook),
    ctaSecondary: triad((h) => h.ctaHow),
    introTitle: triad((h) => h.whyTitle),
    introLead: triad((h) => h.whyLead),
    benefitsTitle: triad((h) => h.whyTitle),
    benefitsLead: triad((h) => h.whyLead),
    benefit1Title: triad((h) => h.feature1Title),
    benefit1Text: triad((h) => h.feature1Text),
    benefit2Title: triad((h) => h.feature2Title),
    benefit2Text: triad((h) => h.feature2Text),
    benefit3Title: triad((h) => h.feature3Title),
    benefit3Text: triad((h) => h.feature3Text),
    stepsTitle: triad((h) => h.stepsTitle),
    stepsLead: triad((h) => h.stepsLead),
    step1Title: triad((h) => h.step1Title),
    step1Text: triad((h) => h.step1Text),
    step2Title: triad((h) => h.step2Title),
    step2Text: triad((h) => h.step2Text),
    step3Title: triad((h) => h.step3Title),
    step3Text: triad((h) => h.step3Text),
    ctaBandTitle: triad((h) => h.ctaBandTitle),
    ctaBandText: triad((h) => h.ctaBandText),
    ctaBandButton: triad((h) => h.ctaBandButton),
    galleryTitle: triad((h) => h.galleryTitle),
  };
}
