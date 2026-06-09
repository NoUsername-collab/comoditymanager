"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminHudIcon } from "@/components/admin/AdminHudIcons";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { PwaInstallInstructions } from "@/components/pwa/PwaInstallInstructions";

type Variant = "gear" | "drawer";

export function PwaInstallAction({
  variant,
  onAfterClick,
}: {
  variant: Variant;
  onAfterClick?: () => void;
}) {
  const t = useTranslations("admin.pwa");
  const { visible, mode, install } = usePwaInstall();
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  if (!visible || !mode) return null;

  async function handleClick() {
    if (mode === "prompt") {
      const outcome = await install();
      if (outcome === "accepted") {
        onAfterClick?.();
      }
      return;
    }
    setInstructionsOpen(true);
    onAfterClick?.();
  }

  const label = t("installApp");

  return (
    <>
      {variant === "gear" ? (
        <button
          type="button"
          className="admin-gear__item admin-gear__item--button"
          role="menuitem"
          onClick={() => void handleClick()}
        >
          <AdminHudIcon name="phone" className="admin-gear__item-icon" />
          <span>{label}</span>
        </button>
      ) : (
        <button
          type="button"
          className="ml-drawer__link ml-drawer__link--button"
          onClick={() => void handleClick()}
        >
          <AdminHudIcon name="phone" className="ml-drawer__link-icon" />
          <span>{label}</span>
        </button>
      )}

      {mode && mode !== "prompt" && (
        <PwaInstallInstructions
          open={instructionsOpen}
          mode={mode}
          onClose={() => setInstructionsOpen(false)}
        />
      )}
    </>
  );
}
