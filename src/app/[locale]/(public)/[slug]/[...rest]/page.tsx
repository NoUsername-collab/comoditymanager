import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicNotFoundMetadata } from "@/features/public-site/page-metadata";
import { loadPublicSiteConfig } from "@/features/public-site/loaders";

/**
 * The site has no pages below /<slug>: an address like /a/b gets the site's own
 * 404 (with its header and menu) rather than the platform's.
 */
export async function generateMetadata(): Promise<Metadata> {
  return publicNotFoundMetadata(await loadPublicSiteConfig());
}

export default function NoDeeperPage(): never {
  notFound();
}
