export const HEALTH_ICON: Record<string, string> = {
  true: "🟢",
  false: "🔴",
};

export const ACTION_COLOR: Record<string, string> = {
  "auth.login": "text-sky-400",
  "auth.logout": "text-neutral-500",
  "booking.request_created": "text-amber-400",
  "booking.confirmed": "text-emerald-400",
  "booking.cancelled": "text-red-400",
};

export const DEV_LEVEL_COLOR: Record<string, string> = {
  error: "text-red-400",
  warn: "text-amber-400",
  info: "text-sky-400",
  debug: "text-neutral-400",
};
