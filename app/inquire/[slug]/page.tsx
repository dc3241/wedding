import Link from "next/link";
import type { Metadata } from "next";
import { InquireForm } from "@/app/inquire/[slug]/InquireForm";
import { AccountBrandMark } from "@/components/branding/account-brand-mark";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Wordmark } from "@/components/ui/topbar";
import { brandAccentStyle } from "@/lib/branding/accent-style";
import { inquiryHeaderTheme } from "@/lib/branding/inquiry-header";
import type { ProjectBranding } from "@/lib/branding/types";
import { cn } from "@/lib/cn";
import { getInquiryBranding } from "@/lib/inquiry/get-branding";
import { isInquirySlug } from "@/lib/inquiry/parse";

export const metadata: Metadata = {
  title: "Inquiry",
  description: "Send an inquiry about planning your wedding.",
};

export const dynamic = "force-dynamic";

function InquireShell({
  children,
  branding = null,
}: {
  children: React.ReactNode;
  branding?: ProjectBranding | null;
}) {
  const whiteLabeled = Boolean(branding);

  return (
    <div
      className="flex min-h-full flex-col bg-canvas text-ink"
      style={brandAccentStyle(branding)}
    >
      <header className="border-b border-hairline px-6 py-[18px] md:px-8">
        {whiteLabeled && branding ? (
          <AccountBrandMark branding={branding} />
        ) : (
          <Link href="/" className="inline-block no-underline">
            <Wordmark />
          </Link>
        )}
      </header>
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-6 py-12 md:px-8">
        {children}
        {whiteLabeled ? (
          <p className="mt-auto pt-10 text-center text-[13px] text-muted">
            <Link href="/" className="text-muted no-underline hover:text-ink">
              Powered by First Look
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default async function InquirePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).trim().toLowerCase();

  if (!isInquirySlug(slug)) {
    return (
      <InquireShell>
        <InvalidLink />
      </InquireShell>
    );
  }

  const result = await getInquiryBranding(slug);

  if (!result.accountFound) {
    return (
      <InquireShell>
        <InvalidLink />
      </InquireShell>
    );
  }

  const header = inquiryHeaderTheme(result.branding);
  const light = header?.tone !== "dark";

  return (
    <InquireShell branding={result.branding}>
      <div
        className={cn(
          "rounded-[28px] px-8 py-10 text-center shadow-[0_18px_44px_-14px_rgba(61,36,48,0.45)]",
          !header && "bg-deep",
        )}
        style={header ? { backgroundColor: header.background } : undefined}
      >
        <p
          className={cn(
            "text-[12px] font-semibold uppercase tracking-[0.09em]",
            light
              ? header
                ? "text-white/80"
                : "text-[var(--deep-eyebrow)]"
              : "text-ink/70",
          )}
        >
          Inquiry
        </p>
        <h1
          className={cn(
            "mt-3 text-[32px] font-extrabold leading-none tracking-[-0.03em] md:text-[40px]",
            light ? "text-white" : "text-ink",
          )}
        >
          Get in touch
        </h1>
        <p
          className={cn(
            "mx-auto mt-4 max-w-md text-[15px] leading-relaxed",
            light ? "text-white/70" : "text-ink/75",
          )}
        >
          Tell them a little about your wedding. This goes straight to their
          inquiry list — nothing is sent until they reply.
        </p>
      </div>
      <Card className="relative mt-8 p-8">
        <InquireForm slug={slug} />
      </Card>
    </InquireShell>
  );
}

function InvalidLink() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-md p-8 text-center">
        <Eyebrow className="mb-3 block">Inquiry</Eyebrow>
        <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink">
          Link not valid
        </h1>
        <p className="mt-4 text-[15px] font-medium text-muted">
          This inquiry link isn&apos;t valid. Ask the planner or venue for a
          new one.
        </p>
      </Card>
    </div>
  );
}
