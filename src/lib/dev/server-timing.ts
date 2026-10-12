/** Dev-only server-side timing — logs to console, zero prod overhead. */
function isServerTimingEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

type ServerTimer = {
  mark: (step: string) => void;
  finish: (extra?: Record<string, unknown>) => void;
};

export function createServerTimer(label: string): ServerTimer {
  const start = performance.now();
  const steps: { step: string; ms: number }[] = [];

  return {
    mark(step: string) {
      steps.push({ step, ms: Math.round(performance.now() - start) });
    },
    finish(extra) {
      if (!isServerTimingEnabled()) return;
      const totalMs = Math.round(performance.now() - start);
      console.info(`[server:${label}] ${totalMs}ms`, { ...extra, steps });
    },
  };
}
