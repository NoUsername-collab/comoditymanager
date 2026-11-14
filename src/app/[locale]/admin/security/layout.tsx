import { AreaMessages } from "@/i18n/AreaMessages";

/** Staff only, with every text the admin has. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaMessages>{children}</AreaMessages>;
}
