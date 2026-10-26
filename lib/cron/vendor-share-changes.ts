import "server-only";

import { sendEmail } from "@/lib/email/send";
import { buildVendorShareChangeEmail } from "@/lib/vendors/share-change-email";
import { displayCoupleNames } from "@/lib/wedding-date";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const SHARE_CHANGE_THROTTLE_MS = 60 * 60 * 1000;

export type VendorShareChangeJob = {
  project_vendor_id: string;
  confirm_token: string;
  vendor_name: string;
  vendor_email: string | null;
  wedding_name: string;
  current_hash: string;
  stored_hash: string | null;
  last_notified_at: string | null;
};

export type VendorShareChangeRun = {
  baselined: number;
  emailed: number;
  skippedNoEmail: number;
  skippedThrottled: number;
  skippedBadHash: number;
  errors: string[];
};

function parseJobs(value: unknown): VendorShareChangeJob[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (
      typeof item.project_vendor_id !== "string" ||
      typeof item.confirm_token !== "string" ||
      typeof item.vendor_name !== "string" ||
      typeof item.wedding_name !== "string" ||
      typeof item.current_hash !== "string"
    ) {
      return [];
    }
    return [
      {
        project_vendor_id: item.project_vendor_id,
        confirm_token: item.confirm_token,
        vendor_name: item.vendor_name,
        vendor_email:
          typeof item.vendor_email === "string" ? item.vendor_email : null,
        wedding_name: item.wedding_name,
        current_hash: item.current_hash,
        stored_hash:
          typeof item.stored_hash === "string" ? item.stored_hash : null,
        last_notified_at:
          typeof item.last_notified_at === "string"
            ? item.last_notified_at
            : null,
      },
    ];
  });
}

function isThrottled(lastNotifiedAt: string | null, now: number): boolean {
  if (!lastNotifiedAt) return false;
  const last = Date.parse(lastNotifiedAt);
  return Number.isFinite(last) && now - last < SHARE_CHANGE_THROTTLE_MS;
}

async function stampSnapshot(
  supabase: ReturnType<typeof createServiceRoleClient>,
  projectVendorId: string,
  hash: string,
  notified: boolean,
): Promise<string | null> {
  const patch: {
    share_snapshot_hash: string;
    share_change_notified_at?: string;
  } = { share_snapshot_hash: hash };
  if (notified) {
    patch.share_change_notified_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("project_vendors")
    .update(patch)
    .eq("id", projectVendorId);
  return error ? error.message : null;
}

export async function runVendorShareChangeNotify(): Promise<VendorShareChangeRun> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("list_vendor_share_change_jobs");
  if (error) {
    throw new Error(error.message);
  }

  const now = Date.now();
  const result: VendorShareChangeRun = {
    baselined: 0,
    emailed: 0,
    skippedNoEmail: 0,
    skippedThrottled: 0,
    skippedBadHash: 0,
    errors: [],
  };

  for (const job of parseJobs(data)) {
    if (!job.current_hash) {
      result.skippedBadHash += 1;
      continue;
    }

    if (!job.stored_hash) {
      const stampError = await stampSnapshot(
        supabase,
        job.project_vendor_id,
        job.current_hash,
        false,
      );
      if (stampError) {
        result.errors.push(`${job.project_vendor_id}: ${stampError}`);
        continue;
      }
      result.baselined += 1;
      continue;
    }

    if (isThrottled(job.last_notified_at, now)) {
      result.skippedThrottled += 1;
      continue;
    }

    const email = job.vendor_email?.trim() ?? "";
    if (!email) {
      const stampError = await stampSnapshot(
        supabase,
        job.project_vendor_id,
        job.current_hash,
        false,
      );
      if (stampError) {
        result.errors.push(`${job.project_vendor_id}: ${stampError}`);
      }
      result.skippedNoEmail += 1;
      continue;
    }

    const weddingName = displayCoupleNames(job.wedding_name);
    const body = buildVendorShareChangeEmail({
      vendorName: job.vendor_name.trim() || "there",
      weddingName,
      shareToken: job.confirm_token,
    });
    const sent = await sendEmail({
      to: email,
      subject: body.subject,
      text: body.text,
      html: body.html,
    });
    if (!sent.ok) {
      result.errors.push(`${job.project_vendor_id}: ${sent.error}`);
      continue;
    }

    const stampError = await stampSnapshot(
      supabase,
      job.project_vendor_id,
      job.current_hash,
      true,
    );
    if (stampError) {
      result.errors.push(`${job.project_vendor_id}: stamp ${stampError}`);
    }
    result.emailed += 1;
  }

  return result;
}
