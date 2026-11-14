import { AreaMessages } from "@/i18n/AreaMessages";

/** Confirming a request's rooms: staff only, with every text the app has. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AreaMessages>{children}</AreaMessages>;
}
