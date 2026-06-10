"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";

const PublicSiteConfigContext = createContext<PublicSiteConfig | null>(null);

export function PublicSiteConfigProvider({
  config,
  children,
}: {
  config: PublicSiteConfig;
  children: ReactNode;
}) {
  return (
    <PublicSiteConfigContext.Provider value={config}>
      {children}
    </PublicSiteConfigContext.Provider>
  );
}

export function usePublicSiteConfig(): PublicSiteConfig {
  const config = useContext(PublicSiteConfigContext);
  if (!config) {
    throw new Error("usePublicSiteConfig must be used within PublicSiteConfigProvider");
  }
  return config;
}

export function useOptionalPublicSiteConfig(): PublicSiteConfig | null {
  return useContext(PublicSiteConfigContext);
}
