import "server-only";

import { NextResponse } from "next/server";

/** 401 body for cron routes that fail the CRON_SECRET bearer gate. */
export function unauthorizedCronResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Sole gate on Vercel Cron route handlers: `Authorization: Bearer ${CRON_SECRET}`.
 * Missing/empty secret rejects every request (no open cron path).
 */
export function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
