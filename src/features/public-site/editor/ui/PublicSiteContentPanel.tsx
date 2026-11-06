"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { PublicSiteSectionCard } from "@/features/public-site/editor/ui/PublicSiteSectionCard";
import {
  ChromeEditor,
  ContactBarEditor,
  HeroEditor,
  PlaceEditor,
  StaysEditor,
} from "@/features/public-site/editor/ui/PublicSiteFixedBlockEditors";
import { usePublicSiteEditor } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  addSectionDraft,
  moveSectionDraft,
  movableSections,
  sectionField,
  type SectionDraft,
} from "@/features/public-site/editor/model/section-draft";
import { patchStudioSection } from "@/features/public-site/editor/model/studio-draft";
import { SECTION_KINDS, sectionKind } from "@/features/public-site/sections/kinds";
import { sectionEditor } from "@/features/public-site/sections/registry";

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

  /** Collapsed card line: the section's title, or how many photos it has. */
  function summaryFor(section: SectionDraft): string | undefined {
    const kind = sectionKind(section.type);
    if (kind.shownOnlyWithItems) {
      const count = section.items.filter((item) => item.structure.url?.trim()).length;
      return count > 0 ? te("photoCount", { count }) : te("noPhotos");
    }
    if (!kind.summaryField) return undefined;
    const title = sectionField(section, draft.editLocale, kind.summaryField).trim();
    return title ? `„${title}”` : undefined;
  }

  function sectionCard(section: SectionDraft, move?: { up?: () => void; down?: () => void }) {
    const kind = sectionKind(section.type);
    const Editor = sectionEditor(section.type);
    // Repeatable kinds are told apart by their own title.
    const ownName = kind.repeatable ? sectionField(section, draft.editLocale, "title").trim() : "";
    return (
      <PublicSiteSectionCard
        key={section.key}
        editKey={section.key}
        name={ownName || te(`cards.${section.type}.name`)}
        description={te(`cards.${section.type}.desc`)}
        summary={kind.repeatable ? undefined : summaryFor(section)}
        pinned={kind.pinnedLast ? "bottom" : undefined}
        visible={section.visible}
        onToggleVisible={(visible) =>
          setDraft((d) => patchStudioSection(d, section.key, (current) => ({ ...current, visible })))
        }
        onMoveUp={move?.up}
        onMoveDown={move?.down}
        open={openKey === section.key}
        onToggleOpen={() => toggle(section.key)}
      >
        <Editor section={section} />
      </PublicSiteSectionCard>
    );
  }

  const movable = movableSections(draft.sections);
  const pinned = draft.sections.filter((section) => sectionKind(section.type).pinnedLast);
  const repeatable = Object.values(SECTION_KINDS).filter((kind) => kind.repeatable);

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

        {movable.map((section, index) =>
          sectionCard(section, {
            up:
              index > 0
                ? () => setDraft((d) => ({ ...d, sections: moveSectionDraft(d.sections, section.key, -1) }))
                : undefined,
            down:
              index < movable.length - 1
                ? () => setDraft((d) => ({ ...d, sections: moveSectionDraft(d.sections, section.key, 1) }))
                : undefined,
          }),
        )}

        {repeatable.map((kind) => {
          const count = draft.sections.filter((section) => section.type === kind.type).length;
          return (
            <li key={kind.type} className="pub-editor-cards__add">
              <AdminButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={count >= (kind.repeatable?.max ?? 0)}
                onClick={() => {
                  const key = crypto.randomUUID();
                  const sections = addSectionDraft(draft.sections, kind.type, key);
                  if (!sections) return;
                  setDraft((d) => ({ ...d, sections }));
                  setOpenKey(key);
                }}
              >
                + {te(`cards.${kind.type}.add`)}
              </AdminButton>
            </li>
          );
        })}

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

        {pinned.map((section) => sectionCard(section))}

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
