"use client";

import { useTranslations } from "next-intl";
import type { BookingNoticeDraft } from "@/features/public-site/domain/booking-notice";
import type { PublicSiteSettingsInput } from "@/features/public-site/domain/types";
import { BookingNoticeEditor } from "@/features/public-site/editor/ui/BookingNoticeEditor";
import { IdentityContactSummary } from "@/features/settings/ui/IdentityContactSummary";
import {
  EditorAdvanced,
  EditorField,
  EditorToggle,
  usePublicSiteEditor,
} from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  patchStudioCopy,
  syncStudioStructure,
} from "@/features/public-site/editor/model/studio-draft";

/** How guests reach the guesthouse: Identity's details, or site-only ones. */
export function ContactSettingsEditor() {
  const t = useTranslations("admin.pages.publicSite");
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, patchDraft, fieldError, primaryContact } = usePublicSiteEditor();
  // What visitors see: a site-only value wins, else Identity fills the gap.
  const shown = {
    phone: draft.contactPhone.trim() || (draft.usePrimaryContact ? primaryContact.phone : null),
    email: draft.contactEmail.trim() || (draft.usePrimaryContact ? primaryContact.email : null),
    whatsapp:
      draft.contactWhatsapp.trim() || (draft.usePrimaryContact ? primaryContact.whatsapp : null),
  };

  return (
    <>
      <IdentityContactSummary contact={shown} lead={te("contactFromIdentity")} />
      <EditorAdvanced label={te("contactOverrideTitle")}>
        <EditorToggle
          label={te("usePrimaryContact")}
          hint={te("usePrimaryContactHint")}
          checked={draft.usePrimaryContact}
          onChange={(usePrimaryContact) => patchDraft({ usePrimaryContact })}
        />
        <div className="admin-settings-fields admin-settings-fields--2col mt-3">
          <EditorField
            label={t("phone")}
            type="tel"
            value={draft.contactPhone}
            onChange={(contactPhone) => patchDraft({ contactPhone })}
            error={fieldError("contact.phone")}
          />
          <EditorField
            label="Email"
            type="email"
            value={draft.contactEmail}
            onChange={(contactEmail) => patchDraft({ contactEmail })}
            error={fieldError("contact.email")}
          />
          <EditorField
            label="WhatsApp"
            value={draft.contactWhatsapp}
            placeholder="+40..."
            onChange={(contactWhatsapp) => patchDraft({ contactWhatsapp })}
            error={fieldError("contact.whatsapp")}
          />
        </div>
        <p className="pub-editor-lead mt-3">{te("socialTitle")}</p>
        <div className="admin-settings-fields admin-settings-fields--2col">
          <EditorField
            label="Facebook"
            value={draft.contactFacebook}
            placeholder="https://facebook.com/…"
            onChange={(contactFacebook) => patchDraft({ contactFacebook })}
            error={fieldError("contact.facebook")}
          />
          <EditorField
            label="Instagram"
            value={draft.contactInstagram}
            placeholder="@…"
            onChange={(contactInstagram) => patchDraft({ contactInstagram })}
            error={fieldError("contact.instagram")}
          />
          <EditorField
            label="Telegram"
            value={draft.contactTelegram}
            placeholder="@username"
            onChange={(contactTelegram) => patchDraft({ contactTelegram })}
            error={fieldError("contact.telegram")}
          />
        </div>
      </EditorAdvanced>
    </>
  );
}

/** Whether guests can send a booking request, and where the "Book" button shows. */
export function BookingSettingsEditor() {
  const te = useTranslations("admin.pages.publicSite.editor");
  const { draft, patchDraft } = usePublicSiteEditor();
  return (
    <>
      <EditorToggle
        label={te("bookingEnabled")}
        checked={draft.bookingEnabled}
        onChange={(bookingEnabled) => patchDraft({ bookingEnabled })}
      />
      {draft.bookingEnabled ? (
        <div className="admin-settings-fields mt-3">
          <label>
            <span>{te("bookingLinkWhere")}</span>
            <select
              value={draft.bookingNavPosition}
              onChange={(e) =>
                patchDraft({
                  bookingNavPosition: e.target.value as PublicSiteSettingsInput["bookingNavPosition"],
                })
              }
            >
              <option value="both">{te("bookingPosBoth")}</option>
              <option value="nav">{te("bookingPosNav")}</option>
              <option value="footer">{te("bookingPosFooter")}</option>
              <option value="hidden">{te("bookingPosHidden")}</option>
            </select>
          </label>
        </div>
      ) : null}
    </>
  );
}

/** What guests read beside the booking form before they send a request. */
export function BookingNoticeSettingsEditor() {
  const { config, draft, copy, setDraft } = usePublicSiteEditor();

  function patchNotice(noticeDraft: BookingNoticeDraft) {
    setDraft((d) => syncStudioStructure(patchStudioCopy(d, { noticeDraft })));
  }

  return (
    <BookingNoticeEditor
      value={copy.noticeDraft}
      onChange={patchNotice}
      locale={draft.editLocale}
      checkInTime={config.checkInTime}
      checkOutTime={config.checkOutTime}
    />
  );
}
