"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { AppearanceSettingsAside } from "@/features/settings/ui/AppearanceSettingsAside";

const AppearanceSettingsAsideDynamic = dynamic(
  () =>
    import("@/features/settings/ui/AppearanceSettingsAside").then((m) => ({
      default: m.AppearanceSettingsAside,
    })),
  {
    ssr: false,
    loading: () => (
      <aside className="settings-aside settings-aside--loading" aria-busy="true" />
    ),
  },
);

export function AppearanceSettingsAsideLazy(
  props: ComponentProps<typeof AppearanceSettingsAside>,
) {
  return <AppearanceSettingsAsideDynamic {...props} />;
}
