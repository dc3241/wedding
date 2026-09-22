import Link from "next/link";
import type { Metadata } from "next";
import { PublicProposalActions } from "@/app/proposal/[token]/PublicProposalActions";
import { AccountBrandMark } from "@/components/branding/account-brand-mark";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { Wordmark } from "@/components/ui/topbar";
import { brandAccentStyle } from "@/lib/branding/accent-style";
import {
  formatProposalCurrency,
  PROPOSAL_STATUS_LABEL,
  PROPOSAL_STATUS_VARIANT,
} from "@/components/proposals/types";
import { getPublicProposalByToken } from "@/lib/proposals/public";
import type { PublicProposal } from "@/lib/proposals/public";

export const metadata: Metadata = {
  title: "Proposal",
  description: "Review a wedding proposal.",
};

export const dynamic = "force-dynamic";

function ProposalShell({
  children,
  branding = null,
}: {
  children: React.ReactNode;
  branding?: PublicProposal["branding"];
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
      <div className="flex flex-1 justify-center px-4 py-12">
        {children}
      </div>
      {whiteLabeled ? (
        <p className="pb-8 text-center text-[13px] text-muted">
          <Link href="/" className="text-muted no-underline hover:text-ink">
            Powered by First Look
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function InvalidLink() {
  return (
    <Card className="w-full max-w-md p-8 text-center">
      <Eyebrow className="mb-3 block">Proposal</Eyebrow>
      <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink">
        Link not valid
      </h1>
      <p className="mt-4 text-[15px] font-medium text-muted">
        This proposal link isn&apos;t valid. Ask your planner for a new one.
      </p>
    </Card>
  );
}

function formatWeddingDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAcceptedAt(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PublicProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const proposal = await getPublicProposalByToken(token);

  if (!proposal) {
    return (
      <ProposalShell>
        <InvalidLink />
      </ProposalShell>
    );
  }

  const weddingDate = formatWeddingDate(proposal.wedding_date);
  const acceptedLabel = formatAcceptedAt(proposal.accepted_at);
  const canRespond = proposal.status === "sent";

  return (
    <ProposalShell branding={proposal.branding}>
      <Card className="w-full max-w-2xl space-y-6 p-6 sm:p-8">
        <div className="space-y-3">
          <Eyebrow className="block">Proposal</Eyebrow>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink max-md:text-[28px]">
                {proposal.title}
              </h1>
              <p className="mt-2 text-[15px] font-medium text-muted">
                For {proposal.couple_name}
                {proposal.account_name
                  ? ` · from ${proposal.account_name}`
                  : ""}
              </p>
              {weddingDate ? (
                <p className="mt-1 text-[13px] text-muted">{weddingDate}</p>
              ) : null}
            </div>
            <Pill variant={PROPOSAL_STATUS_VARIANT[proposal.status]}>
              {PROPOSAL_STATUS_LABEL[proposal.status]}
            </Pill>
          </div>
          {proposal.status === "accepted" && acceptedLabel ? (
            <p className="text-[13px] text-sage">Accepted {acceptedLabel}</p>
          ) : null}
          {proposal.status === "declined" ? (
            <p className="text-[13px] text-rosewood">This proposal was declined.</p>
          ) : null}
        </div>

        {proposal.line_items.length > 0 ? (
          <div className="overflow-hidden rounded-[var(--radius-inner)] bg-well shadow-recessed">
            <ul className="divide-y divide-hairline">
              {proposal.line_items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-ink">
                      {item.description}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {item.quantity} × {formatProposalCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="shrink-0 text-[15px] font-medium tabular-nums text-ink">
                    {formatProposalCurrency(item.quantity * item.unit_price)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
              <span className="text-[13px] font-medium text-muted">Total</span>
              <span className="text-[19px] font-extrabold tracking-[-0.02em] tabular-nums text-ink">
                {formatProposalCurrency(proposal.total)}
              </span>
            </div>
          </div>
        ) : null}

        {proposal.notes?.trim() ? (
          <div>
            <h2 className="text-[13px] font-medium text-muted">Notes</h2>
            <p className="mt-1 whitespace-pre-wrap text-[15px] font-medium text-ink">
              {proposal.notes}
            </p>
          </div>
        ) : null}

        {proposal.terms?.trim() ? (
          <div>
            <h2 className="text-[13px] font-medium text-muted">Terms</h2>
            <p className="mt-1 whitespace-pre-wrap text-[15px] font-medium text-ink">
              {proposal.terms}
            </p>
          </div>
        ) : null}

        <PublicProposalActions token={token} canRespond={canRespond} />
      </Card>
    </ProposalShell>
  );
}
