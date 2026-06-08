import type { ReactNode } from "react";

type MobileContentProps = {
  children: ReactNode;
  className?: string;
  as?: "main" | "div" | "section";
};

/** Page body wrapper — pairs with .ml-content overflow guards. */
export function MobileContent({
  children,
  className,
  as: Tag = "div",
}: MobileContentProps) {
  return (
    <Tag
      className={["ml-content", "ml-main", className].filter(Boolean).join(" ")}
    >
      {children}
    </Tag>
  );
}
