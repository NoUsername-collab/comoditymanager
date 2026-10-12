import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export const intlMiddleware = createIntlMiddleware(routing);
