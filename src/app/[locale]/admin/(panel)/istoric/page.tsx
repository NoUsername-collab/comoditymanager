import { localeRedirect as redirect } from "@/i18n/server-redirect";

export default async function AdminIstoricPage() {
  await redirect("/admin/settings?section=history");
}
