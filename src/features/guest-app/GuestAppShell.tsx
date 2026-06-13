import type { ReactNode } from "react";
import type { GuestAppAppearance, GuestAppFeatureDef } from "@/domain/guest-app/types";
import {
  guestAppThemeClassName,
  resolveGuestAppThemeStyle,
} from "@/features/guest-app/themes/loader";
import { GuestAppBottomNav } from "./GuestAppBottomNav";
import { GuestAppHashScroll } from "./GuestAppHashScroll";
import { GuestAppHeader } from "./GuestAppHeader";
import { GuestAppOfflineBanner } from "./GuestAppOfflineBanner";
import { GuestAppToastProvider } from "./GuestAppToast";
import { GuestReceptionFab } from "./GuestReceptionFab";
import { GuestStayProgressBar } from "./GuestStayProgressBar";

type StayProgress = {
  today: string;
  checkIn: string;
  checkOut: string;
};

type Props = {
  appearance: GuestAppAppearance;
  publicThemeId: string;
  pensionName: string;
  children: ReactNode;
  accessCode?: string;
  features?: GuestAppFeatureDef[];
  showNavigation?: boolean;
  receptionPhone?: string | null;
  stayProgress?: StayProgress | null;
};

export function GuestAppShell({
  accessCode = "",
  appearance,
  publicThemeId,
  pensionName,
  features = [],
  showNavigation = true,
  receptionPhone,
  stayProgress,
  children,
}: Props) {
  const style = resolveGuestAppThemeStyle(appearance, publicThemeId);
  const className = guestAppThemeClassName(appearance, publicThemeId);
  const withNav = showNavigation && accessCode;

  return (
    <GuestAppToastProvider>
      <div
        className={[
          className,
          withNav ? "guest-app--with-nav min-h-[100dvh]" : "min-h-[100dvh]",
        ]
          .filter(Boolean)
          .join(" ")}
        style={style}
      >
        <GuestAppOfflineBanner />
        {stayProgress ? <GuestStayProgressBar {...stayProgress} /> : null}
        <GuestAppHashScroll />
        <GuestAppHeader
          accessCode={accessCode}
          pensionName={pensionName}
          appearance={appearance}
        />
        <main className="guest-app__main mx-auto max-w-lg px-4 py-6">{children}</main>
        {withNav ? (
          <GuestAppBottomNav accessCode={accessCode} features={features} />
        ) : null}
        {receptionPhone?.trim() ? (
          <GuestReceptionFab phone={receptionPhone} />
        ) : null}
      </div>
    </GuestAppToastProvider>
  );
}
