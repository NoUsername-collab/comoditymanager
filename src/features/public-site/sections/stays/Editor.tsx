"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";
import { EditorToggle } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

export function StaysEditor({ section }: SectionEditorProps) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const ed = useSectionEditing(section);
  return (
    <>
      <EditorToggle
        label={te("stayPrices")}
        checked={ed.setting("showPrices") !== "0"}
        onChange={(show) => ed.setSetting("showPrices")(show ? "1" : "0")}
      />
      <SettingsFieldHint className="mt-2 block">
        {te("staysHint")}{" "}
        <Link href="/admin/rooms" className="underline">
          {te("openRooms")}
        </Link>
      </SettingsFieldHint>
    </>
  );
}
