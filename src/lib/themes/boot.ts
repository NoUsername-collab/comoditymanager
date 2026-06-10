import { THEME_MODE_STORAGE_KEY } from "./storage";
import { adminThemeBootSnippet } from "@/design/themes/admin";

/** Boot in <head> — no flash, runs before paint */
export const THEME_BOOT_SCRIPT = adminThemeBootSnippet();
