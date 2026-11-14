import { AreaMessages } from "@/i18n/AreaMessages";

/**
 * The staff area. Sign-in, forgotten and new password send the browser only
 * their own texts; the panel, onboarding and two-step setup add every admin
 * text in their own layouts.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AreaMessages
      only={[
        "admin.login",
        "admin.forgotPassword",
        "admin.resetPassword",
        "admin.mfa",
        "admin.common",
        "admin.logout",
      ]}
    >
      {children}
    </AreaMessages>
  );
}
