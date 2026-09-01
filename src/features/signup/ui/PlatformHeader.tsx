import { PlatformHeaderChrome } from "@/layout/components/PlatformHeaderChrome";
import { getTranslations } from "next-intl/server";

export async function PlatformHeader({
  variant = "dark",
}: {
  variant?: "dark" | "split";
}) {
  const t = await getTranslations("platform.header");

  return (
    <header
      className={`platform-header${variant === "split" ? " platform-header--split" : ""}`}
    >
      <PlatformHeaderChrome
        labels={{
          pricing: t("pricing"),
          login: t("login"),
          signup: t("signup"),
        }}
      />
    </header>
  );
}
