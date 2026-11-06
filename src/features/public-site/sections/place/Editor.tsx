"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";

export function PlaceEditor() {
  const te = useTranslations("admin.pages.publicSite.editor");
  return (
    <SettingsFieldHint className="block">
      {te("placeHint")}{" "}
      <Link href="/admin/settings/identity" className="underline">
        {te("openLocation")}
      </Link>
    </SettingsFieldHint>
  );
}
