import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const HMAC_MAX_AGE_SECONDS = 5 * 60;

export type KieCallbackBody = {
  taskId: string | null;
  code: number | null;
  msg: string;
  state: string | null;
  model: string | null;
  resultJson: string | null;
  failMsg: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseKieCallback(raw: unknown): KieCallbackBody {
  const body = asRecord(raw) ?? {};
  const data = asRecord(body.data) ?? {};
  const taskId =
    asString(data.taskId) ??
    asString(data.task_id) ??
    asString(body.taskId) ??
    asString(body.task_id);
  const resultJson =
    asString(data.resultJson) ??
    (data.resultJson != null ? JSON.stringify(data.resultJson) : null);
  return {
    taskId,
    code: asNumber(body.code),
    msg: asString(body.msg) ?? "",
    state: asString(data.state),
    model: asString(data.model),
    resultJson,
    failMsg: asString(data.failMsg) ?? asString(body.msg) ?? "",
  };
}

export function extractResultUrls(resultJson: string | null): string[] {
  if (!resultJson) return [];
  try {
    const parsed: unknown = JSON.parse(resultJson);
    const record = asRecord(parsed);
    const urls = record?.resultUrls;
    if (!Array.isArray(urls)) return [];
    return urls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url));
  } catch {
    return [];
  }
}

export function callbackSucceeded(parsed: KieCallbackBody): boolean {
  if (parsed.state === "fail") return false;
  if (parsed.code != null && parsed.code !== 200) return false;
  if (parsed.state === "success") return true;
  return parsed.code === 200;
}

/**
 * Optional HMAC (KIE webhookHmacKey). When KIE_WEBHOOK_HMAC_KEY is unset,
 * callers must still refuse unknown kie_task_id values — that is the
 * compensating control. Signed payload: taskId + "." + X-Webhook-Timestamp.
 */
export function verifyKieWebhookSignature(args: {
  taskId: string;
  timestamp: string | null;
  signature: string | null;
}): { ok: true } | { ok: false; status: 401; error: string } {
  const secret = process.env.KIE_WEBHOOK_HMAC_KEY?.trim();
  if (!secret) return { ok: true };

  const { timestamp, signature } = args;
  if (!timestamp || !signature) {
    return { ok: false, status: 401, error: "Missing signature headers" };
  }

  const tsRaw = Number(timestamp);
  if (!Number.isFinite(tsRaw)) {
    return { ok: false, status: 401, error: "Invalid signature timestamp" };
  }
  const ts = tsRaw > 1e12 ? Math.floor(tsRaw / 1000) : tsRaw;
  const nowSec = Math.floor(Date.now() / 1000);
  const age = Math.abs(nowSec - ts);
  if (age > HMAC_MAX_AGE_SECONDS) {
    return { ok: false, status: 401, error: "Expired signature" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${args.taskId}.${timestamp}`)
    .digest("base64");

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signature);
  if (expectedBuf.length !== receivedBuf.length) {
    return { ok: false, status: 401, error: "Invalid signature" };
  }
  if (!timingSafeEqual(expectedBuf, receivedBuf)) {
    return { ok: false, status: 401, error: "Invalid signature" };
  }
  return { ok: true };
}
