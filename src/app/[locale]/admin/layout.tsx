import { AreaMessages } from "@/i18n/AreaMessages";

/** The admin: staff only, with every text the app has. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaMessages>{children}</AreaMessages>;
}
