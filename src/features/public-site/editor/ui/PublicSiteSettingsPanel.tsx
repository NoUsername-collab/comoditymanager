"use client";

import type { ReactNode } from "react";
import { titleWithName } from "@/features/public-site/domain/seo";
import { useTranslations } from "next-intl";
import {
  OutlineDetail,
  OutlineGroup,
  OutlineRow,
} from "@/features/public-site/editor/ui/PublicSiteOutline";
import {
  BookingNoticeSettingsEditor,
  BookingSettingsEditor,
  ContactSettingsEditor,
} from "@/features/public-site/editor/ui/PublicSiteContactPanel";
import {
  GoogleEditor,
  LegalPagesEditor,
  OtherPagesEditor,
} from "@/features/public-site/editor/ui/PublicSitePagesPanel";
import { usePublicSiteEditor } from "@/features/public-site/editor/ui/PublicSiteEditorKit";

/** Parts of the Settings tab, as the checklist and links address them. */
export type SettingsPartKey = "contact" | "booking" | "notice" | "legal" | "google" | "pages";

type SettingsPart = {
  key: SettingsPartKey;
  name: string;
  description: string;
  summary: string;
  editor: ReactNode;
};

/**
 * The Settings tab, built like the Page tab: an outline of what the site needs
 * around the homepage, each part opened on its own screen.
 */
export function PublicSiteSettingsPanel({
  openKey,
  onOpenKeyChange: setOpenKey,
}: {
  openKey: SettingsPartKey | null;
  onOpenKeyChange: (key: SettingsPartKey | null) => void;
}) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const { config, draft, copy, primaryContact } = usePublicSiteEditor();

  const phone = draft.contactPhone.trim() || (draft.usePrimaryContact ? primaryContact.phone : null);
  const email = draft.contactEmail.trim() || (draft.usePrimaryContact ? primaryContact.email : null);
  const bookingPositions = {
    both: te("bookingPosBoth"),
    nav: te("bookingPosNav"),
    footer: te("bookingPosFooter"),
    hidden: te("bookingPosHidden"),
  } as const;

  const contact: SettingsPart = {
    key: "contact",
    name: te("contactTitle"),
    description: te("contactDesc"),
    summary: [phone, email].filter(Boolean).join(" · ") || te("contactMissing"),
    editor: <ContactSettingsEditor />,
  };
  const booking: SettingsPart = {
    key: "booking",
    name: te("bookingTitle"),
    description: te("bookingDesc"),
    summary: draft.bookingEnabled ? bookingPositions[draft.bookingNavPosition] : te("bookingOff"),
    editor: <BookingSettingsEditor />,
  };
  const notice: SettingsPart = {
    key: "notice",
    name: te("noticeTitle"),
    description: te("noticeDesc"),
    summary: te("noticeDesc"),
    editor: <BookingNoticeSettingsEditor />,
  };
  const legal: SettingsPart = {
    key: "legal",
    name: te("legalTitle"),
    description: te("legalDesc"),
    summary: copy.privacyBody.trim() ? te("legalSummary") : te("privacyMissing"),
    editor: <LegalPagesEditor />,
  };
  const google: SettingsPart = {
    key: "google",
    name: te("googleTitle"),
    description: te("googleDesc"),
    summary: titleWithName(
      copy.seoTitle.trim() || copy.heroTitle.trim() || config.displayName,
      config.displayName,
    ),
    editor: <GoogleEditor />,
  };
  const pages: SettingsPart = {
    key: "pages",
    name: te("otherPagesTitle"),
    description: te("otherPagesDesc"),
    summary: te("otherPagesDesc"),
    editor: <OtherPagesEditor />,
  };

  // "What to know" only matters while guests can send requests.
  const bookingParts = draft.bookingEnabled ? [contact, booking, notice] : [contact, booking];
  const pageParts = [legal, google, pages];

  const opened = [...bookingParts, ...pageParts].find((part) => part.key === openKey);
  if (opened) {
    return (
      <OutlineDetail
        name={opened.name}
        description={opened.description}
        onBack={() => setOpenKey(null)}
      >
        {opened.editor}
      </OutlineDetail>
    );
  }

  const row = (part: SettingsPart) => (
    <OutlineRow
      key={part.key}
      rowKey={part.key}
      name={part.name}
      summary={part.summary}
      onOpen={() => setOpenKey(part.key)}
    />
  );

  return (
    <>
      <OutlineGroup title={te("settingsGroupBooking")}>{bookingParts.map(row)}</OutlineGroup>
      <OutlineGroup title={te("settingsGroupPages")}>{pageParts.map(row)}</OutlineGroup>
    </>
  );
}
