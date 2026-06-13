"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function GuestAppOfflineBanner() {
  const t = useTranslations("guestApp.shell");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="guest-app__offline" role="status">
      {t("offline")}
    </div>
  );
}
