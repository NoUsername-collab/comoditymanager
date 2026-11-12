"use client";

import { readGalleryAlbums } from "@/features/public-site/domain/gallery";
import { useEffect, useState, type ReactNode } from "react";
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
  sectionKindLimit,
  type SectionDraft,
} from "@/features/public-site/editor/model/section-draft";
import {
  patchStudioPage,
  patchStudioSection,
  removeStudioPage,
  removeStudioSection,
  sectionsOf,
  withSections,
} from "@/features/public-site/editor/model/studio-draft";
import { MenuEditor } from "@/features/public-site/editor/ui/MenuEditor";
import { NewPageForm, PageSettingsEditor, PageSwitcher } from "@/features/public-site/editor/ui/SitePageEditors";
import { SECTION_KINDS, sectionKind } from "@/features/public-site/sections/kinds";
import { sectionEditor } from "@/features/public-site/sections/registry";
import { SectionStyleEditor } from "@/features/public-site/editor/ui/SectionStyleEditor";

/** What a row or an opened part needs: its name, its line, its switch and its editor. */
type PagePart = {
  key: string;
  name: string;
  description: string;
  summary?: string;
  visible?: boolean;
  onToggleVisible?: (visible: boolean) => void;
  editor: ReactNode;
  /** Present for sections the operator added and may take away. */
  onRemove?: () => void;
  removeLabel?: string;
  removeConfirm?: string;
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
  const tp = useTranslations("admin.pages.publicSite.editor.sitePages");
  const { draft, copy, setDraft, patchDraft, library, activePage, setActivePage } = usePublicSiteEditor();
  const [adding, setAdding] = useState(false);
  const [newPage, setNewPage] = useState(false);
  // The page being edited: the first page (null) or an own page.
  const page = activePage ? draft.pages.find((row) => row.key === activePage) : undefined;
  const ownPage = Boolean(page);
  const sections = sectionsOf(draft, activePage);
  const drag = useOutlineDrag(
    (key, targetKey) =>
      setDraft((d) => withSections(d, activePage, moveSectionDraftTo(sectionsOf(d, activePage), key, targetKey))),
    (key, direction) =>
      setDraft((d) => withSections(d, activePage, moveSectionDraft(sectionsOf(d, activePage), key, direction))),
  );

  // An opened part starts at its top, whether opened here or from the preview.
  useEffect(() => {
    if (!openKey) return;
    document.querySelector(".pub-site-studio__form")?.scrollTo({ top: 0 });
  }, [openKey, scrollSeq]);

  /** Collapsed line: the section's title, or how many photos its albums hold. */
  function summaryFor(section: SectionDraft): string | undefined {
    const kind = sectionKind(section.type);
    if (section.type === "gallery") {
      const albums = readGalleryAlbums((section.settings.albums ?? "").split(",").filter(Boolean));
      const count = library.filter((photo) => albums.length === 0 || albums.includes(photo.album)).length;
      return count > 0 ? te("photoCount", { count }) : te("noPhotos");
    }
    if (!kind.summaryField) return te(`cards.${section.type}.desc`);
    const title = sectionField(section, draft.editLocale, kind.summaryField).trim();
    return title ? `„${title}”` : te(`cards.${section.type}.desc`);
  }

  function sectionPart(section: SectionDraft): PagePart {
    const kind = sectionKind(section.type);
    const Editor = sectionEditor(section.type);
    // Kinds that sit side by side are told apart by their own title.
    const ownName = kind.namedByTitle ? sectionField(section, draft.editLocale, "title").trim() : "";
    return {
      key: section.key,
      name: ownName || te(`cards.${section.type}.name`),
      description: te(`cards.${section.type}.desc`),
      summary: kind.namedByTitle ? te(`cards.${section.type}.desc`) : summaryFor(section),
      // On an own page every section may go; on the first page, those the operator adds.
      onRemove:
        kind.addable || ownPage
          ? () => {
              setDraft((d) => removeStudioSection(d, section.key));
              setOpenKey(null);
            }
          : undefined,
      visible: section.visible,
      onToggleVisible: (visible) =>
        setDraft((d) => patchStudioSection(d, section.key, (current) => ({ ...current, visible }))),
      editor: (
        <>
          <Editor section={section} />
          <SectionStyleEditor section={section} />
        </>
      ),
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
    editor: <ChromeEditor onOpenMenu={() => setOpenKey("menu")} />,
  };
  const menu: PagePart = {
    key: "menu",
    name: te("cards.menu.name"),
    description: te("cards.menu.desc"),
    summary: te("menu.count", { count: draft.menu.length }),
    editor: <MenuEditor />,
  };
  const pageName = page ? page.copy[draft.editLocale].title.trim() || `/${page.slug}` : "";
  const pageSettings: PagePart | null = page
    ? {
        key: `page:${page.key}`,
        name: tp("settingsName"),
        description: tp("settingsDesc"),
        summary: `/${page.slug}`,
        visible: page.visible,
        onToggleVisible: (visible) => setDraft((d) => patchStudioPage(d, page.key, (row) => ({ ...row, visible }))),
        editor: <PageSettingsEditor page={page} />,
        onRemove: () => {
          setDraft((d) => removeStudioPage(d, page.key));
          setActivePage(null);
        },
        removeLabel: tp("remove"),
        removeConfirm: tp("removeConfirm", { name: pageName }),
      }
    : null;

  const movable = movableSections(sections).map(sectionPart);
  const pinnedLast = sections
    .filter((section) => sectionKind(section.type).pinnedLast)
    .map(sectionPart);
  const top = pageSettings ?? hero;
  const all = [top, ...movable, ...pinnedLast, menu, contactBar, chrome];

  const opened = openKey ? all.find((part) => part.key === openKey) : undefined;
  if (opened) {
    return (
      <OutlineDetail
        name={opened.name}
        description={opened.description}
        visible={opened.visible}
        onToggleVisible={opened.onToggleVisible}
        onBack={() => setOpenKey(null)}
        onRemove={opened.onRemove}
        removeLabel={opened.removeLabel}
        removeConfirm={opened.removeConfirm}
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
  // Kinds still to add, below their limit on this page (an own page takes any kind).
  const addable = Object.values(SECTION_KINDS).filter(
    (kind) =>
      sections.filter((section) => section.type === kind.type).length < sectionKindLimit(kind.type, ownPage),
  );
  function addSection(type: SectionDraft["type"]) {
    const key = crypto.randomUUID();
    const next = addSectionDraft(sections, type, key, ownPage);
    if (!next) return;
    setDraft((d) => withSections(d, activePage, next));
    setAdding(false);
    setOpenKey(key);
  }

  if (newPage) return <NewPageForm onDone={() => setNewPage(false)} />;

  return (
    <>
      <PageSwitcher onNewPage={() => setNewPage(true)} />

      {onQuickStart && !ownPage ? (
        <button type="button" className="pub-editor-quickstart-btn" onClick={onQuickStart}>
          <strong>{te("quickStart.open")}</strong>
          <span>{te("quickStart.openHint")}</span>
        </button>
      ) : null}

      <p className="pub-editor-lead">{ownPage ? tp("panelLead") : te("contentLead")}</p>

      <OutlineGroup title={page ? tp("outline", { name: pageName }) : te("outlinePage")}>
        {row(top, { pinned: "top" })}
        {movable.map((part) => row(part, { drag: true }))}
        {addable.length > 0 ? (
          <li className="pub-outline__add">
            {adding ? (
              <div className="pub-add-section" role="menu" aria-label={te("addSection")}>
                {addable.map((kind) => (
                  <button
                    key={kind.type}
                    type="button"
                    role="menuitem"
                    className="pub-add-section__kind"
                    onClick={() => addSection(kind.type)}
                  >
                    <strong>{te(`cards.${kind.type}.name`)}</strong>
                    <span>{te(`cards.${kind.type}.desc`)}</span>
                  </button>
                ))}
                <button type="button" className="pub-add-section__cancel" onClick={() => setAdding(false)}>
                  {te("cancel")}
                </button>
              </div>
            ) : (
              <AdminButton type="button" variant="secondary" size="sm" onClick={() => setAdding(true)}>
                + {te("addSection")}
              </AdminButton>
            )}
          </li>
        ) : null}
        {pinnedLast.map((part) => row(part, { pinned: "bottom" }))}
      </OutlineGroup>

      <OutlineGroup title={te("outlineSite")}>
        {row(menu)}
        {row(contactBar)}
        {row(chrome)}
      </OutlineGroup>
    </>
  );
}
