import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Wordmark } from "@/components/ui/topbar";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

export const metadata: Metadata = {
  title: "Vendor confirmation",
  description: "Confirm your arrival for a wedding.",
};

export const dynamic = "force-dynamic";

type ConfirmPayload = {
  vendor_name: string;
  wedding_name: string;
  already_confirmed: boolean;
};

function ConfirmShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="border-b border-hairline px-6 py-[18px] md:px-8">
        <Link href="/" className="inline-block no-underline">
          <Wordmark />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-8">{children}</Card>
      </div>
    </div>
  );
}

async function confirmVendor(token: string): Promise<
  | { ok: true; payload: ConfirmPayload }
  | { ok: false }
> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false };

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("confirm_project_vendor", {
    p_token: trimmed,
  });

  if (error || !data) return { ok: false };

  const row = Array.isArray(data) ? data[0] : data;
  if (
    !row ||
    typeof row.vendor_name !== "string" ||
    typeof row.wedding_name !== "string"
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    payload: {
      vendor_name: row.vendor_name,
      wedding_name: row.wedding_name,
      already_confirmed: Boolean(row.already_confirmed),
    },
  };
}

export default async function VendorConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await confirmVendor(decodeURIComponent(token));

  if (!result.ok) {
    return (
      <ConfirmShell>
        <div className="text-center">
          <Eyebrow className="mb-3 block">Confirmation</Eyebrow>
          <h1 className="font-display text-[32px] leading-none tracking-[-0.03em] text-ink md:text-[36px]">
            Link not valid
          </h1>
          <p className="mt-4 text-[15px] font-medium text-muted">
            This confirmation link isn&apos;t valid. Ask the couple or planner
            for a new one.
          </p>
        </div>
      </ConfirmShell>
    );
  }

  const { payload } = result;
  const heading = payload.already_confirmed
    ? "Already confirmed"
    : "You're confirmed";
  const body = payload.already_confirmed
    ? `You're already confirmed for ${payload.wedding_name}.`
    : `Thanks, you're confirmed for ${payload.wedding_name}.`;

  return (
    <ConfirmShell>
      <div className="text-center">
        <Eyebrow className="mb-3 block">Confirmation</Eyebrow>
        <h1 className="font-display text-[32px] leading-none tracking-[-0.03em] text-ink md:text-[36px]">
          {heading}
        </h1>
        <p className="mt-4 text-[15px] font-medium text-muted">{body}</p>
      </div>
    </ConfirmShell>
  );
}
