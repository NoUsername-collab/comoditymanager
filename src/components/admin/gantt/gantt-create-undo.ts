import type { useRouter } from "@/i18n/navigation";
import { undoGanttCreateAction } from "@/app/[locale]/admin/(panel)/calendar/actions";
import type { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";

export function showGanttCreateUndoToast(
  showToast: ReturnType<typeof useAdminFx>["showToast"],
  router: ReturnType<typeof useRouter>,
  title: string,
  message: string,
  undo: { kind: "hold" | "block"; id?: string; ids?: string[] },
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
      void undoGanttCreateAction(undo).then((res) => {
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
