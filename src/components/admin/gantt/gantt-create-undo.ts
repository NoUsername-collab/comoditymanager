import type { useRouter } from "next/navigation";
import { undoGanttCreateAction } from "@/app/admin/(panel)/calendar/actions";
import type { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";

export function showGanttCreateUndoToast(
  showToast: ReturnType<typeof useAdminFx>["showToast"],
  router: ReturnType<typeof useRouter>,
  title: string,
  message: string,
  undo: { kind: "hold" | "block"; id?: string; ids?: string[] }
) {
  showToast({
    kind: "success",
    title,
    message,
    actionLabel: "Anulează",
    onAction: () => {
      void undoGanttCreateAction(undo).then((res) => {
        if (res.ok) {
          router.refresh();
          showToast({
            kind: "info",
            title: "Anulat",
            message: "Acțiunea a fost reversată.",
          });
        }
      });
    },
  });
}
