import type { Metadata } from "next";
import { NotFoundView } from "@/app/_document/not-found-view";

export const metadata: Metadata = { title: "Zalmox · 404" };

/** For addresses no route matches; it has no layout, so it brings its own document. */
export default function GlobalNotFound() {
  return (
    <html lang="ro">
      <body style={{ margin: 0 }}>
        <NotFoundView />
      </body>
    </html>
  );
}
