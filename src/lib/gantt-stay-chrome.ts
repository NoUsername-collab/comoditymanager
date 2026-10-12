

/** Clasă pe bară — stilizare doar prin --gs-* (vezi admin-gantt-stay-island.css). */
const GANTT_STAY_CHROME = "gantt-stay-chrome";

export function ganttStayChromeClass(extra = ""): string {
  return [GANTT_STAY_CHROME, extra].filter(Boolean).join(" ");
}
