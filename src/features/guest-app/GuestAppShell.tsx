import type { ReactNode } from "react";
import type { GuestAppAppearance } from "@/domain/guest-app/types";

type Props = {
  appearance: GuestAppAppearance;
  pensionName: string;
  children: ReactNode;
};

export function GuestAppShell({ appearance, pensionName, children }: Props) {
  const primary = appearance.primaryColor ?? "#0f766e";
  const accent = appearance.accentColor ?? "#14b8a6";

  return (
    <div
      className="guest-app min-h-screen bg-zinc-950 text-zinc-50"
      style={
        {
          "--guest-app-primary": primary,
          "--guest-app-accent": accent,
        } as React.CSSProperties
      }
    >
      <header className="guest-app__header border-b border-white/10 px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {appearance.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={appearance.logoUrl}
              alt=""
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: primary }}
            >
              {pensionName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-400">
              Guest app
            </p>
            <p className="font-semibold">{pensionName}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}
