import type { ComponentProps } from "react";
import { Suspense } from "react";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { filterShellMenuSetupIssues } from "@/domain/setup-issues/checks";
import { resolveSetupIssues } from "@/services/setup-issues";
import type { TenantMemberRole } from "@/services/tenant-members";

type AdminTopBarProps = ComponentProps<typeof AdminTopBar>;

type Props = Omit<AdminTopBarProps, "setupIssues"> & {
  staffEmail?: string | null;
  memberRole?: TenantMemberRole | null;
};

async function AdminTopBarResolved({
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
  return <AdminTopBar {...rest} setupIssues={setupIssues} />;
}

/** Streams setup-issue resolution without blocking the admin shell. */
export function AdminTopBarWithSetupIssues(props: Props) {
  const { staffEmail, memberRole, ...topBarProps } = props;
  return (
    <Suspense fallback={<AdminTopBar {...topBarProps} setupIssues={[]} />}>
      <AdminTopBarResolved
        staffEmail={staffEmail}
        memberRole={memberRole}
        {...topBarProps}
      />
    </Suspense>
  );
}
