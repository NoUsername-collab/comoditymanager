import { INVOICE_SEASON_CSS } from "@/lib/invoice/invoice-season-styles";

/** Self-contained styles for the isolated invoice print document. */
const ISSUED_INVOICE_PRINT_CSS = `
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #18181b;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .issued-invoice-sheet {
    overflow: visible;
    border: none;
    border-radius: 0;
    background: #fff;
    box-shadow: none;
  }
  .issued-invoice-sheet__header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    background: linear-gradient(135deg, #18181b, #27272a);
    color: #fff;
  }
  .issued-invoice-sheet__eyebrow {
    margin: 0;
    font-size: 0.6875rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #fbbf24;
  }
  .issued-invoice-sheet__seller {
    margin: 0.35rem 0 0;
    font-size: 1.5rem;
    font-weight: 700;
  }
  .issued-invoice-sheet__meta {
    margin: 0.25rem 0 0;
    font-size: 0.8125rem;
    color: #d4d4d8;
  }
  .issued-invoice-sheet__number-box {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.15rem;
    font-size: 0.8125rem;
  }
  .issued-invoice-sheet__number-box strong {
    font-size: 1.25rem;
  }
  .issued-invoice-sheet__parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1rem 1.5rem;
  }
  .issued-invoice-sheet__label {
    margin: 0;
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #71717a;
  }
  .issued-invoice-sheet__value {
    margin: 0.25rem 0 0;
    font-size: 1rem;
    font-weight: 600;
  }
  .issued-invoice-sheet__table-wrap {
    padding: 0 1.5rem;
    overflow: visible;
  }
  .issued-invoice-sheet__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  .issued-invoice-sheet__table th,
  .issued-invoice-sheet__table td {
    padding: 0.65rem 0.5rem;
    border-bottom: 1px solid #e4e4e7;
    text-align: left;
  }
  .issued-invoice-sheet__table th:last-child,
  .issued-invoice-sheet__table td:last-child {
    text-align: right;
  }
  .issued-invoice-sheet__footer {
    padding: 1rem 1.5rem 1.25rem;
  }
  .issued-invoice-sheet__totals {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.35rem;
    margin-bottom: 0.75rem;
  }
  .issued-invoice-sheet__totals div {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
  }
  .issued-invoice-sheet__total-row strong {
    font-size: 1.125rem;
    color: #18181b;
  }
  .issued-invoice-sheet__legal {
    margin: 0;
    font-size: 0.75rem;
    color: #71717a;
    line-height: 1.45;
  }
  .issued-invoice-sheet__brand {
    margin: 0.75rem 0 0;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #b45309;
  }

  ${INVOICE_SEASON_CSS}
`;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildPrintHtml(sheetHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="ro">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${ISSUED_INVOICE_PRINT_CSS}</style>
  </head>
  <body>${sheetHtml}</body>
</html>`;
}

function printInCurrentWindow(sheet: HTMLElement): void {
  document.documentElement.classList.add("invoice-print-mode");
  const cleanup = () => {
    document.documentElement.classList.remove("invoice-print-mode");
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(cleanup, 60_000);
  void sheet.offsetHeight;
  window.print();
}

/**
 * Prints only the invoice sheet via a hidden iframe (no popup tab).
 * Avoids admin shell overflow issues and noopener blank-tab bugs in Chrome.
 */
export function printIssuedInvoiceSheet(
  sheet: HTMLElement,
  title: string
): void {
  const html = buildPrintHtml(sheet.outerHTML, title);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", title);
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
  });

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!win || !doc) {
    iframe.remove();
    printInCurrentWindow(sheet);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    iframe.remove();
  };

  win.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(cleanup, 60_000);

  const triggerPrint = () => {
    try {
      win.focus();
      win.print();
    } catch {
      cleanup();
      printInCurrentWindow(sheet);
    }
  };

  if (doc.readyState === "complete") {
    requestAnimationFrame(() => requestAnimationFrame(triggerPrint));
    return;
  }

  iframe.addEventListener(
    "load",
    () => requestAnimationFrame(() => requestAnimationFrame(triggerPrint)),
    { once: true },
  );
}
