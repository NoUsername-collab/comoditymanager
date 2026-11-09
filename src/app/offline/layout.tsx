import { RootDocument, rootMetadata, rootViewport } from "@/app/_document/root-document";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default function OfflineLayout({ children }: { children: React.ReactNode }) {
  return <RootDocument lang="ro">{children}</RootDocument>;
}
