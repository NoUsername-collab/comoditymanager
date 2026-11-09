"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";

/**
 * A textarea for formatted text (see domain/rich-text), with buttons that write
 * the format for the operator: bold, a link, a list. Typing the marks by hand
 * works the same.
 */
export function RichTextField({
  label,
  value,
  onChange,
  hint,
  rows = 6,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
}) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  /** Replace the selection with what `wrap` makes of it, then select the result's text. */
  function edit(wrap: (selected: string) => { text: string; select?: [number, number] }) {
    const area = areaRef.current;
    if (!area) return;
    const { selectionStart: start, selectionEnd: end } = area;
    const result = wrap(value.slice(start, end));
    onChange(value.slice(0, start) + result.text + value.slice(end));
    const [from, to] = result.select ?? [result.text.length, result.text.length];
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + from, start + to);
    });
  }

  function bold() {
    edit((selected) => {
      const text = selected || te("richBoldPlaceholder");
      return { text: `**${text}**`, select: [2, 2 + text.length] };
    });
  }

  function link() {
    const address = window.prompt(te("richLinkPrompt"), "https://");
    if (!address || address === "https://") return;
    edit((selected) => {
      const text = selected || te("richLinkPlaceholder");
      return { text: `[${text}](${address.trim()})`, select: [1, 1 + text.length] };
    });
  }

  function list() {
    edit((selected) => {
      const lines = (selected || te("richListPlaceholder")).split("\n");
      const text = lines.map((line) => (/^\s*[-•*]\s+/.test(line) ? line : `- ${line}`)).join("\n");
      return { text };
    });
  }

  return (
    <label className="pub-rich-field">
      <span>{label}</span>
      <span className="pub-rich-field__tools" role="toolbar" aria-label={te("richToolbar")}>
        <button type="button" onClick={bold} title={te("richBold")} aria-label={te("richBold")}>
          <strong>B</strong>
        </button>
        <button type="button" onClick={link} title={te("richLink")} aria-label={te("richLink")}>
          🔗
        </button>
        <button type="button" onClick={list} title={te("richList")} aria-label={te("richList")}>
          ••
        </button>
      </span>
      <textarea ref={areaRef} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      <SettingsFieldHint>{hint ?? te("richHint")}</SettingsFieldHint>
    </label>
  );
}
