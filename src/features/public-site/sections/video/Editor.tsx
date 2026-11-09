"use client";

import { useTranslations } from "next-intl";
import { videoEmbedUrl } from "@/features/public-site/domain/video";
import { EditorField } from "@/features/public-site/editor/ui/PublicSiteEditorKit";
import {
  useSectionEditing,
  type SectionEditorProps,
} from "@/features/public-site/editor/ui/section-editing";

export function VideoEditor({ section }: SectionEditorProps) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const ed = useSectionEditing(section);
  const url = ed.setting("url");
  // Say at once when an address is not a film we can show.
  const unknown = url.trim() !== "" && videoEmbedUrl(url) === null;
  return (
    <div className="admin-settings-fields">
      <EditorField
        label={te("videoUrl")}
        value={url}
        placeholder="https://www.youtube.com/watch?v=…"
        onChange={ed.setSetting("url")}
        hint={te("videoUrlHint")}
        error={unknown ? te("videoUrlUnknown") : undefined}
      />
      <EditorField label={te("sectionTitle")} value={ed.field("title")} onChange={ed.setField("title")} />
      <EditorField rows={2} label={te("sectionLead")} value={ed.field("lead")} onChange={ed.setField("lead")} />
    </div>
  );
}
