import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { pickMessages, SHARED_CLIENT_NAMESPACES } from "@/i18n/client-messages";

/**
 * The texts one area of the app sends to the browser, on top of the shared set
 * every page has: all of them (`only` left out, for staff areas) or the
 * namespaces named. A nested provider replaces the outer one's messages, so the
 * shared set is included again.
 */
export async function AreaMessages({
  only,
  children,
}: {
  only?: readonly string[];
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={only ? pickMessages(messages, [...SHARED_CLIENT_NAMESPACES, ...only]) : messages}
    >
      {children}
    </NextIntlClientProvider>
  );
}
