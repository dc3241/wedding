import Link from "next/link";
import type { Metadata } from "next";
import { InquireForm } from "@/app/inquire/[slug]/InquireForm";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Wordmark } from "@/components/ui/topbar";
import { isInquirySlug } from "@/lib/inquiry/parse";

export const metadata: Metadata = {
  title: "Inquiry",
  description: "Send an inquiry about planning your wedding.",
};

export const dynamic = "force-dynamic";

function InquireShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="border-b border-hairline px-6 py-[18px] md:px-8">
        <Link href="/" className="inline-block no-underline">
          <Wordmark />
        </Link>
      </header>
      <div className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-6 py-12 md:px-8">
        {children}
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

  return (
    <InquireShell>
      <div className="rounded-[28px] bg-deep px-8 py-10 text-center shadow-[0_18px_44px_-14px_rgba(61,36,48,0.45)]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--deep-eyebrow)]">
          Inquiry
        </p>
        <h1 className="mt-3 text-[32px] font-extrabold leading-none tracking-[-0.03em] text-white md:text-[40px]">
          Get in touch
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
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
