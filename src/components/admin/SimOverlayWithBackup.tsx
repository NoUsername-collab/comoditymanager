import { Suspense } from "react";
import { SimOverlay } from "@/components/admin/SimOverlay";
import { isSimBackupPresent } from "@/services/simulation";
import type { SimStatus } from "@/domain/simulation/sim-types";

type Props = {
  simStatus: SimStatus;
  realDate: string;
};

async function SimOverlayResolved({ simStatus, realDate }: Props) {
  const dbBackupActive = simStatus.active
    ? await isSimBackupPresent().catch(() => false)
    : true;

  return (
    <SimOverlay
      active={simStatus.active}
      currentDate={simStatus.active ? simStatus.currentDate : null}
      daysAdvanced={simStatus.active ? simStatus.daysAdvanced : 0}
      realDate={realDate}
      dbBackupActive={dbBackupActive}
    />
  );
}

/** Defers sim DB backup RPC until after shell paint. */
export function SimOverlayWithBackup(props: Props) {
  if (!props.simStatus.active) {
    return (
      <SimOverlay
        active={false}
        currentDate={null}
        daysAdvanced={0}
        realDate={props.realDate}
        dbBackupActive
      />
    );
  }

  return (
    <Suspense fallback={null}>
      <SimOverlayResolved {...props} />
    </Suspense>
  );
}
