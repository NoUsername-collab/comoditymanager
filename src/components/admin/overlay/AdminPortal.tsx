"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Randare în afara admin-shell — evită clipping și stacking context-uri locale */
export function AdminPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
