"use client";

import { useTransition } from "react";
import { GUEST_TAG_LABELS } from "@/domain/guest/tags";
import { GUEST_TAGS, type GuestTag } from "@/domain/guest/types";
import { updateGuestTagsAction } from "@/app/admin/(panel)/guests/actions";

export function GuestTagsForm({
  guestId,
  initialTags,
}: {
  guestId: string;
  initialTags: GuestTag[];
}) {
  const [pending, startTransition] = useTransition();

  function toggle(tag: GuestTag) {
    const next = initialTags.includes(tag)
      ? initialTags.filter((t) => t !== tag)
      : [...initialTags, tag];
    const fd = new FormData();
    fd.set("guest_id", guestId);
    for (const t of next) fd.append("tags", t);
    startTransition(() => updateGuestTagsAction(fd));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {GUEST_TAGS.map((tag) => {
        const active = initialTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            disabled={pending}
            onClick={() => toggle(tag)}
            className={[
              "rounded border px-3 py-1 text-xs font-semibold transition",
              active
                ? "border-amber-400 bg-amber-100 text-amber-950"
                : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50",
            ].join(" ")}
          >
            {GUEST_TAG_LABELS[tag]}
          </button>
        );
      })}
    </div>
  );
}
