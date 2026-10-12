"use client";

import type { PensionContact } from "@/domain/settings/pension-identity";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import { SettingsFieldError } from "@/components/admin/settings/SettingsFieldError";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";
import {
  linkPresetFor,
  PUBLIC_LINK_PRESETS,
} from "@/features/settings/ui/public-site-editor-model";
import type {
  LocaleCopy,
  PublicSiteStudioDraft,
} from "@/features/settings/ui/public-site-studio-draft";

export type PublicSiteEditorApi = {
  config: PublicSiteConfig;
  /** Contact from Property identity; the site shows it unless overridden. */
  primaryContact: PensionContact;
  draft: PublicSiteStudioDraft;
  copy: LocaleCopy;
  readOnly: boolean;
  setDraft: (update: (draft: PublicSiteStudioDraft) => PublicSiteStudioDraft) => void;
  patchDraft: (partial: Partial<PublicSiteStudioDraft>) => void;
  patchCopy: (partial: Partial<LocaleCopy>) => void;
  fieldError: (...paths: string[]) => string | undefined;
};

const EditorContext = createContext<PublicSiteEditorApi | null>(null);

export function PublicSiteEditorProvider({
  value,
  children,
}: {
  value: PublicSiteEditorApi;
  children: ReactNode;
}) {
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function usePublicSiteEditor(): PublicSiteEditorApi {
  const api = useContext(EditorContext);
  if (!api) throw new Error("usePublicSiteEditor must be used inside PublicSiteEditorProvider");
  return api;
}

/** Labelled text input or textarea with hint / error under it. */
export function EditorField({
  label,
  value,
  onChange,
  hint,
  error,
  rows,
  placeholder,
  type,
  full,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  rows?: number;
  placeholder?: string;
  type?: string;
  full?: boolean;
}) {
  return (
    <label className={full ? "admin-settings-fields__full" : undefined}>
      <span>{label}</span>
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error ? (
        <SettingsFieldError>{error}</SettingsFieldError>
      ) : hint ? (
        <SettingsFieldHint>{hint}</SettingsFieldHint>
      ) : null}
    </label>
  );
}

export function EditorToggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="pub-editor-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="pub-editor-toggle__text">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </span>
    </label>
  );
}

/** Closed-by-default drawer for fields most operators never need. */
export function EditorAdvanced({ children, label }: { children: ReactNode; label?: string }) {
  const t = useTranslations("admin.pages.publicSite.editor");
  return (
    <details className="pub-editor-advanced">
      <summary>
        <span>{label ?? t("advanced")}</span>
        <small>{t("advancedHint")}</small>
      </summary>
      <div className="pub-editor-advanced__body">{children}</div>
    </details>
  );
}

/** Heading block at the top of a tab panel or group. */
export function EditorGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="pub-editor-group">
      <header className="pub-editor-group__head">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

/** Pick where a button leads: known pages first, a typed address only on request. */
export function EditorLinkPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (href: string) => void;
}) {
  const t = useTranslations("admin.pages.publicSite.editor");
  const preset = linkPresetFor(value);
  const [custom, setCustom] = useState(preset === "custom");
  const selected = custom ? "custom" : preset;

  return (
    <div className="pub-editor-link">
      <label>
        <span>{label}</span>
        <select
          value={selected}
          onChange={(e) => {
            const next = e.target.value;
            if (next === "custom") {
              setCustom(true);
              return;
            }
            setCustom(false);
            const match = PUBLIC_LINK_PRESETS.find((row) => row.id === next);
            if (match) onChange(match.href);
          }}
        >
          {PUBLIC_LINK_PRESETS.map((row) => (
            <option key={row.id} value={row.id}>
              {t(`links.${row.id}`)}
            </option>
          ))}
          <option value="custom">{t("links.custom")}</option>
        </select>
      </label>
      {selected === "custom" ? (
        <label>
          <span>{t("links.customLabel")}</span>
          <input
            value={value}
            placeholder="https://"
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      ) : null}
    </div>
  );
}
