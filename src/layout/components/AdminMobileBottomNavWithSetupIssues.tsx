import type { ComponentProps } from "react";
import { Suspense } from "react";
import { AdminMobileBottomNav } from "@/layout/components/AdminMobileBottomNav";
import { filterShellMenuSetupIssues } from "@/domain/setup-issues/checks";
import { resolveSetupIssues } from "@/services/setup-issues";
import type { TenantMemberRole } from "@/services/tenant-members";

type NavProps = ComponentProps<typeof AdminMobileBottomNav>;

type Props = Omit<NavProps, "setupIssuesCount" | "setupIssues"> & {
  staffEmail?: string | null;
  memberRole?: TenantMemberRole | null;
};

async function AdminMobileBottomNavResolved({
  staffEmail,
  memberRole,
  ...rest
}: Props) {
  const setupIssues = filterShellMenuSetupIssues(
    await resolveSetupIssues({
      email: staffEmail,
      memberRole: memberRole ?? null,
    }),
  );
  return (
    <AdminMobileBottomNav
      {...rest}
      setupIssues={setupIssues}
      setupIssuesCount={setupIssues.length}
    />
  );
}

/** Streams setup issues for bottom-nav alert and More drawer without blocking the shell. */
export function AdminMobileBottomNavWithSetupIssues(props: Props) {
  const { staffEmail, memberRole, ...navProps } = props;
  return (
    <Suspense
      fallback={
        <AdminMobileBottomNav {...navProps} setupIssues={[]} setupIssuesCount={0} />
      }
    >
      <AdminMobileBottomNavResolved
        staffEmail={staffEmail}
        memberRole={memberRole}
        {...navProps}
      />
    </Suspense>
  );
}
