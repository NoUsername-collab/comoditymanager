"use client";

import { cloneElement, isValidElement } from "react";
import { useRouter } from "next/navigation";

/**
 * Acces staff invizibil: triple-click pe logo/titlu → login.
 * Nu apare niciun link „Admin” pe site pentru oaspeți.
 */
export function StaffLogoEntry({
  children,
}: {
  children: React.ReactElement<{ onClick?: React.MouseEventHandler }>;
}) {
  const router = useRouter();

  if (!isValidElement(children)) {
    return children;
  }

  const prevOnClick = children.props.onClick;

  return cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      if (e.detail === 3) {
        e.preventDefault();
        router.push("/admin/login?next=/receptie");
        return;
      }
      prevOnClick?.(e);
    },
  });
}
