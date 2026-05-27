import type { GuestFlagLevel } from "@/domain/guest/types";

export function GuestFlagPill({
  flagLevel,
  variant = "default",
}: {
  flagLevel: GuestFlagLevel | null | undefined;
  variant?: "default" | "edge";
}) {
  if (!flagLevel || flagLevel === "normal") return null;

  const style =
    flagLevel === "blacklist"
      ? variant === "edge"
        ? {
            borderColor: "var(--cancelled-border)",
            background: "var(--bg)",
            color: "var(--cancelled-text)",
          }
        : {
            borderColor: "var(--cancelled-border)",
            background: "var(--cancelled-bg)",
            color: "var(--cancelled-text)",
          }
      : variant === "edge"
        ? {
            borderColor: "var(--pending-border)",
            background: "var(--bg)",
            color: "var(--pending-text)",
          }
        : {
            borderColor: "var(--pending-border)",
            background: "var(--pending-bg)",
            color: "var(--pending-text)",
          };

  return (
    <span
      className={[
        variant === "edge"
          ? "inline-flex rounded-bl-md border-l border-b px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
          : "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
      ].join(" ")}
      style={style}
    >
      {flagLevel}
    </span>
  );
}
