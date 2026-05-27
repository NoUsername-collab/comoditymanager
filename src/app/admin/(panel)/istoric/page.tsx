import { redirect } from "next/navigation";

export default async function AdminIstoricPage() {
  redirect("/admin/settings?section=history");
}
