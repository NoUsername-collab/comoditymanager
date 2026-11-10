import type { SectionKind } from "@/features/public-site/sections/kind";

/**
 * The optional photo of a text section ("About us", free texts): its address
 * is the same in every language, so it is a setting; what it shows is copy.
 */
export const sectionPhotoSettings: NonNullable<SectionKind["settings"]> = {
  read: (payload) => ({ imageUrl: typeof payload.imageUrl === "string" ? payload.imageUrl : "" }),
  write: (settings) => {
    const imageUrl = settings.imageUrl?.trim();
    return imageUrl ? { imageUrl } : {};
  },
};
