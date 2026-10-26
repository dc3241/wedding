import "server-only";

import { createAnonServerClient } from "@/utils/supabase/anon-server";

export type VendorShareContact = {
  role: "couple" | "planner" | "venue";
  name: string;
  email: string | null;
};

export type VendorShareVenue = {
  name: string;
  address: string | null;
};

export type VendorShareTimelineItem = {
  title: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  section: string | null;
  owner: string | null;
};

export type VendorSharePayment = {
  label: string | null;
  amount: number;
  due_on: string;
};

export type PublicVendorShare = {
  vendor_name: string;
  vendor_category: string | null;
  wedding_name: string;
  wedding_date: string | null;
  location: string | null;
  arrival_time: string | null;
  scope_note: string | null;
  confirmed_at: string | null;
  quoted_price: number | null;
  venues: VendorShareVenue[];
  contacts: VendorShareContact[];
  timeline: VendorShareTimelineItem[];
  payments: VendorSharePayment[];
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function asContacts(value: unknown): VendorShareContact[] {
  if (!Array.isArray(value)) return [];
  const roles = new Set(["couple", "planner", "venue"]);
  return value.flatMap((row: unknown) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const role = asString(item.role);
    const name = asString(item.name);
    if (!role || !roles.has(role) || !name) return [];
    return [
      {
        role: role as VendorShareContact["role"],
        name,
        email: asString(item.email),
      },
    ];
  });
}

function asVenues(value: unknown): VendorShareVenue[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row: unknown) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const name = asString(item.name);
    if (!name) return [];
    return [{ name, address: asString(item.address) }];
  });
}

function asTimeline(value: unknown): VendorShareTimelineItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row: unknown) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    const title = asString(item.title);
    if (!title) return [];
    return [
      {
        title,
        description: asString(item.description),
        start_time: asString(item.start_time),
        end_time: asString(item.end_time),
        section: asString(item.section),
        owner: asString(item.owner),
      },
    ];
  });
}

function asPayments(value: unknown): VendorSharePayment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row: unknown) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.due_on !== "string") return [];
    const amount = Number(item.amount);
    if (!Number.isFinite(amount)) return [];
    return [
      {
        label: asString(item.label),
        amount,
        due_on: item.due_on,
      },
    ];
  });
}

export async function getPublicVendorShare(
  token: string,
): Promise<PublicVendorShare | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("get_project_vendor_share", {
    p_token: trimmed,
  });

  if (error) {
    if (!/could not find the function/i.test(error.message)) {
      console.error("get_project_vendor_share:", error.message);
    }
    return null;
  }
  if (!data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.share_found !== true) return null;
  if (typeof row.vendor_name !== "string" || typeof row.wedding_name !== "string") {
    return null;
  }

  const quoted =
    row.quoted_price === null || row.quoted_price === undefined
      ? null
      : Number(row.quoted_price);

  return {
    vendor_name: row.vendor_name,
    vendor_category: asString(row.vendor_category),
    wedding_name: row.wedding_name,
    wedding_date: asString(row.wedding_date),
    location: asString(row.location),
    arrival_time: asString(row.arrival_time),
    scope_note: asString(row.scope_note),
    confirmed_at: asString(row.confirmed_at),
    quoted_price: Number.isFinite(quoted) ? quoted : null,
    venues: asVenues(row.venues),
    contacts: asContacts(row.contacts),
    timeline: asTimeline(row.timeline),
    payments: asPayments(row.payments),
  };
}
