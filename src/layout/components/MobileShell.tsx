import { MobileLayoutGuard } from "@/layout/components/MobileLayoutGuard";
import type { LayoutSurface } from "@/layout/mobile";
import type { CSSProperties, ReactNode } from "react";

type MobileShellProps = {
  surface: LayoutSurface;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  "data-pub-template"?: string;
};

/**
 * Structural wrapper — pairs with mobile-layout.css primitives.
 * Add `data-layout-surface` so mobile rules stay scoped per app area.
 */
export function MobileShell({
  surface,
  children,
  className,
  style,
  "data-pub-template": pubTemplate,
}: MobileShellProps) {
  return (
    <div
      className={["ml-shell", `ml-shell--${surface}`, className]
        .filter(Boolean)
        .join(" ")}
      data-layout-surface={surface}
      data-pub-template={pubTemplate}
      style={style}
    >
      <MobileLayoutGuard />
      {children}
    </div>
  );
}
