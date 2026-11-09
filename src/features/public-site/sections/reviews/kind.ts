import type { SectionKind } from "@/features/public-site/sections/kind";

/** Guests' words: a quote, who said it and their stars. */
export const reviewsKind: SectionKind = {
  type: "reviews",
  copyFields: ["title", "lead"],
  progressFields: ["title"],
  summaryField: "title",
  items: {
    copyFields: ["quote", "author"],
    progressFields: ["quote"],
    max: 12,
    readStructure: (saved) => ({
      rating: typeof saved.rating === "number" ? String(saved.rating) : "5",
    }),
    newItem: () => ({ rating: "5" }),
    starter: () => [{ rating: "5" }],
    keep: (_structure, hasCopy) => hasCopy,
    writeStructure: (_id, structure) => {
      const rating = Number(structure.rating);
      return rating >= 1 && rating <= 5 ? { rating: Math.round(rating) } : {};
    },
  },
  addable: { max: 1 },
};
