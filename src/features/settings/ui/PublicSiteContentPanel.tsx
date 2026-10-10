"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { PublicSiteSectionCard } from "@/features/settings/ui/PublicSiteSectionCard";
import {
  BenefitsEditor,
  ChromeEditor,
  ContactBarEditor,
  CtaEditor,
  GalleryEditor,
  HeroEditor,
  IntroEditor,
  PlaceEditor,
  StaysEditor,
  StepsEditor,
  TextBlockEditor,
} from "@/features/settings/ui/PublicSiteSectionEditors";
import { usePublicSiteEditor } from "@/features/settings/ui/PublicSiteEditorKit";
import {
  addStudioTextSection,
  MAX_TEXT_SECTIONS,
  moveStudioSection,
  type PublicSiteStudioDraft,
} from "@/features/settings/ui/public-site-studio-draft";

type OrderedKey = "intro" | "benefits" | "gallery" | "steps" | "cta";

const VISIBILITY_FIELD: Record<OrderedKey, keyof PublicSiteStudioDraft> = {
  intro: "introVisible",
  benefits: "benefitsVisible",
  gallery: "galleryVisible",
  steps: "stepsVisible",
  cta: "ctaVisible",
};

const ORDERED_EDITORS: Record<OrderedKey, () => ReactNode> = {
  intro: () => <IntroEditor />,
  benefits: () => <BenefitsEditor />,
  gallery: () => <GalleryEditor />,
  steps: () => <StepsEditor />,
  cta: () => <CtaEditor />,
};

function isOrderedKey(key: string): key is OrderedKey {
  return key in VISIBILITY_FIELD;
}

export function PublicSiteContentPanel({
  openKey,
  onOpenKeyChange: setOpenKey,
  scrollSeq,
  onOpenContact,
  onQuickStart,
}: {
  openKey: string | null;
  onOpenKeyChange: (key: string | null) => void;
  /** Bumped when the preview asks to reveal `openKey`. */
  scrollSeq: number;
  onOpenContact: () => void;
  onQuickStart?: () => void;
}) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, copy, setDraft, patchDraft } = usePublicSiteEditor();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (scrollSeq === 0 || !openKey) return;
    const card = listRef.current?.querySelector<HTMLElement>(
      `[data-edit-key="${CSS.escape(openKey)}"]`,
    );
    if (!card) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    card.dataset.flash = "1";
    const timer = window.setTimeout(() => delete card.dataset.flash, 1200);
    return () => window.clearTimeout(timer);
    // Only when the preview asks; manual toggles are already in view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollSeq]);

  function toggle(key: string) {
    setOpenKey(openKey === key ? null : key);
  }

  function summaryFor(key: OrderedKey): string | undefined {
    if (key === "gallery") {
      const count = draft.galleryItems.filter((item) => item.url.trim()).length;
      return count > 0 ? te("photoCount", { count }) : te("noPhotos");
    }
    const title = {
      intro: copy.introTitle,
      benefits: copy.benefitsTitle,
      steps: copy.stepsTitle,
      cta: copy.ctaTitle,
    }[key];
    return title.trim() ? `„${title.trim()}”` : undefined;
  }

  const order = draft.sectionOrder;

  return (
    <>
      {onQuickStart ? (
        <button type="button" className="pub-editor-quickstart-btn" onClick={onQuickStart}>
          <strong>{te("quickStart.open")}</strong>
          <span>{te("quickStart.openHint")}</span>
        </button>
      ) : null}

      <p className="pub-editor-lead">{te("contentLead")}</p>

      <ol className="pub-editor-cards" ref={listRef}>
        <PublicSiteSectionCard
          editKey="hero"
          name={te("cards.hero.name")}
          description={te("cards.hero.desc")}
          summary={copy.heroTitle.trim() ? `„${copy.heroTitle.trim()}”` : undefined}
          pinned="top"
          open={openKey === "hero"}
          onToggleOpen={() => toggle("hero")}
        >
          <HeroEditor />
        </PublicSiteSectionCard>

        {order.map((key, index) => {
          const moveUp = index > 0 ? () => setDraft((d) => moveStudioSection(d, key, -1)) : undefined;
          const moveDown =
            index < order.length - 1 ? () => setDraft((d) => moveStudioSection(d, key, 1)) : undefined;

          if (key.startsWith("text:")) {
            const id = key.slice("text:".length);
            const item = copy.textItems.find((row) => row.id === id);
            if (!item) return null;
            return (
              <PublicSiteSectionCard
                key={key}
                editKey={key}
                name={item.title.trim() || te("cards.text.name")}
                description={te("cards.text.desc")}
                visible={draft.textVisible[id] !== false}
                onToggleVisible={(visible) =>
                  patchDraft({ textVisible: { ...draft.textVisible, [id]: visible } })
                }
                onMoveUp={moveUp}
                onMoveDown={moveDown}
                open={openKey === key}
                onToggleOpen={() => toggle(key)}
              >
                <TextBlockEditor item={item} />
              </PublicSiteSectionCard>
            );
          }

          if (!isOrderedKey(key)) return null;
          const field = VISIBILITY_FIELD[key];
          return (
            <PublicSiteSectionCard
              key={key}
              editKey={key}
              name={te(`cards.${key}.name`)}
              description={te(`cards.${key}.desc`)}
              summary={summaryFor(key)}
              visible={draft[field] as boolean}
              onToggleVisible={(visible) =>
                patchDraft({ [field]: visible } as Partial<PublicSiteStudioDraft>)
              }
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              open={openKey === key}
              onToggleOpen={() => toggle(key)}
            >
              {ORDERED_EDITORS[key]()}
            </PublicSiteSectionCard>
          );
        })}

        <li className="pub-editor-cards__add">
          <AdminButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={copy.textItems.length >= MAX_TEXT_SECTIONS}
            onClick={() => {
              const next = addStudioTextSection(draft);
              if (next === draft) return;
              setDraft(() => next);
              setOpenKey(next.sectionOrder[next.sectionOrder.length - 1] ?? null);
            }}
          >
            + {te("addText")}
          </AdminButton>
        </li>

        <PublicSiteSectionCard
          editKey="stays"
          name={te("cards.stays.name")}
          description={te("cards.stays.desc")}
          pinned="bottom"
          visible={draft.showStayOffers}
          onToggleVisible={(showStayOffers) => patchDraft({ showStayOffers })}
          open={openKey === "stays"}
          onToggleOpen={() => toggle("stays")}
        >
          <StaysEditor />
        </PublicSiteSectionCard>

        <PublicSiteSectionCard
          editKey="place"
          name={te("cards.place.name")}
          description={te("cards.place.desc")}
          pinned="bottom"
          visible={draft.showPlace}
          onToggleVisible={(showPlace) => patchDraft({ showPlace })}
          open={openKey === "place"}
          onToggleOpen={() => toggle("place")}
        >
          <PlaceEditor />
        </PublicSiteSectionCard>

        <PublicSiteSectionCard
          editKey="contactBar"
          name={te("cards.contactBar.name")}
          description={te("cards.contactBar.desc")}
          pinned="bottom"
          visible={draft.showContactBar}
          onToggleVisible={(showContactBar) => patchDraft({ showContactBar })}
          open={openKey === "contactBar"}
          onToggleOpen={() => toggle("contactBar")}
        >
          <ContactBarEditor onOpenContact={onOpenContact} />
        </PublicSiteSectionCard>

        <PublicSiteSectionCard
          editKey="chrome"
          name={te("cards.chrome.name")}
          description={te("cards.chrome.desc")}
          open={openKey === "chrome"}
          onToggleOpen={() => toggle("chrome")}
        >
          <ChromeEditor />
        </PublicSiteSectionCard>
      </ol>
    </>
  );
}
