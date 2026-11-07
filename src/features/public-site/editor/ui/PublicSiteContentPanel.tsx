"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import {
  OutlineDetail,
  OutlineGroup,
  OutlineRow,
  useOutlineDrag,
} from "@/features/public-site/editor/ui/PublicSiteOutline";
import {
  ChromeEditor,
  ContactBarEditor,
  HeroEditor,
} from "@/features/public-site/editor/ui/PublicSiteFixedBlockEditors";
import { usePublicSiteEditor } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  addSectionDraft,
  moveSectionDraft,
  moveSectionDraftTo,
  movableSections,
  sectionField,
  type SectionDraft,
} from "@/features/public-site/editor/model/section-draft";
import { patchStudioSection } from "@/features/public-site/editor/model/studio-draft";
import { SECTION_KINDS, sectionKind } from "@/features/public-site/sections/kinds";
import { sectionEditor } from "@/features/public-site/sections/registry";

/** What a row or an opened part needs: its name, its line, its switch and its editor. */
type PagePart = {
  key: string;
  name: string;
  description: string;
  summary?: string;
  visible?: boolean;
  onToggleVisible?: (visible: boolean) => void;
  editor: ReactNode;
};

/**
 * The "Page" tab: an outline of the page in order (the page itself, then what
 * every page of the site shares). Opening a row swaps the outline for that
 * part's editor; "Back" returns to the outline.
 */
export function PublicSiteContentPanel({
  openKey,
  onOpenKeyChange: setOpenKey,
  scrollSeq,
  onOpenContact,
  onQuickStart,
}: {
  openKey: string | null;
  onOpenKeyChange: (key: string | null) => void;
  /** Bumped when the preview asks to open `openKey`. */
  scrollSeq: number;
  onOpenContact: () => void;
  onQuickStart?: () => void;
}) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, copy, setDraft, patchDraft } = usePublicSiteEditor();
  const drag = useOutlineDrag(
    (key, targetKey) =>
      setDraft((d) => ({ ...d, sections: moveSectionDraftTo(d.sections, key, targetKey) })),
    (key, direction) =>
      setDraft((d) => ({ ...d, sections: moveSectionDraft(d.sections, key, direction) })),
  );

  // An opened part starts at its top, whether opened here or from the preview.
  useEffect(() => {
    if (!openKey) return;
    document.querySelector(".pub-site-studio__form")?.scrollTo({ top: 0 });
  }, [openKey, scrollSeq]);

  /** Collapsed line: the section's title, or how many photos it has. */
  function summaryFor(section: SectionDraft): string | undefined {
    const kind = sectionKind(section.type);
    if (kind.shownOnlyWithItems) {
      const count = section.items.filter((item) => item.structure.url?.trim()).length;
      return count > 0 ? te("photoCount", { count }) : te("noPhotos");
    }
    if (!kind.summaryField) return te(`cards.${section.type}.desc`);
    const title = sectionField(section, draft.editLocale, kind.summaryField).trim();
    return title ? `„${title}”` : te(`cards.${section.type}.desc`);
  }

  function sectionPart(section: SectionDraft): PagePart {
    const kind = sectionKind(section.type);
    const Editor = sectionEditor(section.type);
    // Repeatable kinds are told apart by their own title.
    const ownName = kind.repeatable ? sectionField(section, draft.editLocale, "title").trim() : "";
    return {
      key: section.key,
      name: ownName || te(`cards.${section.type}.name`),
      description: te(`cards.${section.type}.desc`),
      summary: kind.repeatable ? te(`cards.${section.type}.desc`) : summaryFor(section),
      visible: section.visible,
      onToggleVisible: (visible) =>
        setDraft((d) => patchStudioSection(d, section.key, (current) => ({ ...current, visible }))),
      editor: <Editor section={section} />,
    };
  }

  const hero: PagePart = {
    key: "hero",
    name: te("cards.hero.name"),
    description: te("cards.hero.desc"),
    summary: copy.heroTitle.trim() ? `„${copy.heroTitle.trim()}”` : te("cards.hero.desc"),
    editor: <HeroEditor />,
  };
  const contactBar: PagePart = {
    key: "contactBar",
    name: te("cards.contactBar.name"),
    description: te("cards.contactBar.desc"),
    summary: te("cards.contactBar.desc"),
    visible: draft.showContactBar,
    onToggleVisible: (showContactBar) => patchDraft({ showContactBar }),
    editor: <ContactBarEditor onOpenContact={onOpenContact} />,
  };
  const chrome: PagePart = {
    key: "chrome",
    name: te("cards.chrome.name"),
    description: te("cards.chrome.desc"),
    summary: te("cards.chrome.desc"),
    editor: <ChromeEditor />,
  };

  const movable = movableSections(draft.sections).map(sectionPart);
  const pinnedLast = draft.sections
    .filter((section) => sectionKind(section.type).pinnedLast)
    .map(sectionPart);
  const all = [hero, ...movable, ...pinnedLast, contactBar, chrome];

  const opened = openKey ? all.find((part) => part.key === openKey) : undefined;
  if (opened) {
    return (
      <OutlineDetail
        name={opened.name}
        description={opened.description}
        visible={opened.visible}
        onToggleVisible={opened.onToggleVisible}
        onBack={() => setOpenKey(null)}
      >
        {opened.editor}
      </OutlineDetail>
    );
  }

  const row = (part: PagePart, extra: { drag?: boolean; pinned?: "top" | "bottom" } = {}) => (
    <OutlineRow
      key={part.key}
      rowKey={part.key}
      name={part.name}
      summary={part.summary}
      visible={part.visible}
      onToggleVisible={part.onToggleVisible}
      onOpen={() => setOpenKey(part.key)}
      drag={extra.drag ? drag : undefined}
      pinned={extra.pinned}
    />
  );
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

      <OutlineGroup title={te("outlinePage")}>
        {row(hero, { pinned: "top" })}
        {movable.map((part) => row(part, { drag: true }))}
        {repeatable.map((kind) => {
          const count = draft.sections.filter((section) => section.type === kind.type).length;
          return (
            <li key={`add-${kind.type}`} className="pub-outline__add">
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
        {pinnedLast.map((part) => row(part, { pinned: "bottom" }))}
      </OutlineGroup>

      <OutlineGroup title={te("outlineSite")}>
        {row(contactBar)}
        {row(chrome)}
      </OutlineGroup>
    </>
  );
}
