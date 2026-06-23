import type { ComponentProps } from "react";
import { Suspense } from "react";
import { SettingsShell } from "@/components/admin/settings/SettingsShell";
import { resolveSetupIssues } from "@/services/setup-issues";
import type { TenantMemberRole } from "@/services/tenant-members";

type ShellProps = ComponentProps<typeof SettingsShell>;

type Props = Omit<ShellProps, "setupIssues"> & {
  staffEmail?: string | null;
  memberRole?: TenantMemberRole | null;
};

async function SettingsShellResolved({
  staffEmail,
  memberRole,
  ...rest
}: Props) {
  const setupIssues = await resolveSetupIssues({
    email: staffEmail,
    memberRole: memberRole ?? null,
  });
  const resolvedRole = memberRole ?? "operator";
  return (
    <SettingsShell
      {...rest}
      memberRole={resolvedRole}
      setupIssues={setupIssues}
    />
  );
}

/** Streams setup-issue badges without blocking settings shell paint. */
export function SettingsShellWithSetupIssues(props: Props) {
  const { staffEmail, memberRole, ...shellProps } = props;
  const resolvedMemberRole = memberRole ?? "operator";
  return (
    <Suspense
      fallback={
        <SettingsShell
          {...shellProps}
          memberRole={resolvedMemberRole}
          setupIssues={[]}
        />
      }
    >
      <SettingsShellResolved
        staffEmail={staffEmail}
        memberRole={resolvedMemberRole}
        {...shellProps}
      />
    </Suspense>
  );
}
