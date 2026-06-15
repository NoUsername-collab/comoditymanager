import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { captureTenantError } from "@/services/dev-logs";
import {
  isTenantRequestHost,
  shouldSkipTenantErrorLog,
} from "@/lib/tenant/error-safeguard";
import { checkRateLimit } from "@/lib/rate-limit";

type Body = {
  message?: string;
  stack?: string | null;
  digest?: string | null;
  path?: string | null;
  boundary?: string | null;
};

export async function POST(request: Request) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";

  const devTenantSlug =
    process.env.NODE_ENV === "development"
      ? process.env.DEV_TENANT_SLUG?.trim()
      : null;
  if (!isTenantRequestHost(host) && !devTenantSlug) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`tenant-err:${clientIp}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const error = new Error(message);
  if (body.stack) error.stack = body.stack;
  if (body.digest) {
    (error as Error & { digest?: string }).digest = body.digest;
  }

  if (!shouldSkipTenantErrorLog(error)) {
    await captureTenantError(error, {
      source: "client",
      requestPath: body.path ?? null,
      requestMethod: "POST",
      requestHost: host,
      context: {
        boundary: body.boundary ?? null,
        digest: body.digest ?? null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
