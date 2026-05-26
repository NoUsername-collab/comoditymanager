import type { GuestFlagLevel } from "@/domain/guest/types";

export function GuestFlagPill({
  flagLevel,
}: {
  flagLevel: GuestFlagLevel | null | undefined;
}) {
  if (!flagLevel || flagLevel === "normal") return null;

  const className =
    flagLevel === "blacklist"
      ? "border-red-300 bg-red-50 text-red-900"
      : "border-amber-300 bg-amber-50 text-amber-950";

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
        className,
      ].join(" ")}
    >
      {flagLevel}
    </span>
  );
}
