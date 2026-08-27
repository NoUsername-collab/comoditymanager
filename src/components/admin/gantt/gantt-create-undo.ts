import { useRouter } from "next/navigation";
import type { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { undoActivityLogAction } from "@/features/activity/actions";
import { undoGanttCreateAction } from "@/features/calendar/actions";

type UndoPayload =
  | { logId: string }
  | { kind: "hold" | "block"; id?: string; ids?: string[]; logId?: string };

export function showGanttCreateUndoToast(
  showToast: ReturnType<typeof useAdminFx>["showToast"],
  router: ReturnType<typeof useRouter>,
  title: string,
  message: string,
  undo: UndoPayload,
  labels: {
    actionLabel: string;
    undoneTitle: string;
    undoneMessage: string;
  }
) {
  showToast({
    kind: "success",
    title,
    message,
    actionLabel: labels.actionLabel,
    onAction: () => {
      const run =
        "logId" in undo && undo.logId
          ? undoActivityLogAction(undo.logId)
          : undoGanttCreateAction(
              undo as { kind: "hold" | "block"; id?: string; ids?: string[] }
            );

      void run.then((res) => {
        if (res.ok) {
          router.refresh();
          showToast({
            kind: "info",
            title: labels.undoneTitle,
            message: labels.undoneMessage,
          });
        }
      });
    },
  });
}
