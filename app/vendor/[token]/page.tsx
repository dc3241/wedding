import Link from "next/link";
import type { Metadata } from "next";
import { ConfirmVendorShareButton } from "@/components/vendors/ConfirmVendorShareButton";
import { SaveVendorShareControl } from "@/components/vendors/SaveVendorShareControl";
import { TokenVendorShareInbox } from "@/components/vendors/VendorShareInboxBound";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { Wordmark } from "@/components/ui/topbar";
import { formatCurrency } from "@/lib/format-currency";
import { noIndexRobots } from "@/lib/seo";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
import {
  getPublicVendorShare,
  type PublicVendorShare,
  type VendorShareContact,
} from "@/lib/vendors/public-share";
import {
  getVendorShareClaimStatus,
  type VendorShareClaimStatus,
} from "@/lib/vendors/claimed-shares";
import { listPublicVendorShareMessages } from "@/lib/vendors/public-share-messages";
import type { VendorShareMessage } from "@/lib/vendors/share-messages";
import { displayCoupleNames, formatEyebrowDate } from "@/lib/wedding-date";

export const metadata: Metadata = {
  title: "Wedding details",
  description: "View shared wedding details.",
  ...noIndexRobots,
};

export const dynamic = "force-dynamic";

function formatTimeOfDay(value: string | null): string | null {
  if (!value) return null;
  const [hours, minutes] = value.split(":");
  const hour = Number(hours);
  const minute = Number(minutes);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeRange(start: string | null, end: string | null): string | null {
  const from = formatTimeOfDay(start);
  const to = formatTimeOfDay(end);
  if (from && to) return `${from} – ${to}`;
  return from ?? to;
}

function contactRoleLabel(role: VendorShareContact["role"]): string {
  if (role === "venue") return "Venue";
  if (role === "planner") return "Planner";
  return "Couple";
}

function ShareShell({ children }: { children: React.ReactNode }) {
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

function InvalidLink() {
  return (
    <Card className="p-8 text-center">
      <Eyebrow className="mb-3 block">Wedding details</Eyebrow>
      <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink">
        Link not valid
      </h1>
      <p className="mt-4 text-[15px] font-medium text-muted">
        This link isn&apos;t valid. Ask the couple or planner for a new one.
      </p>
    </Card>
  );
}

function SharePage({
  share,
  token,
  messages,
  claimStatus,
}: {
  share: PublicVendorShare;
  token: string;
  messages: VendorShareMessage[];
  claimStatus: VendorShareClaimStatus | null;
}) {
  const coupleNames = displayCoupleNames(share.wedding_name);
  const dateLabel = share.wedding_date
    ? formatEyebrowDate(share.wedding_date)
    : null;
  const category = share.vendor_category
    ? vendorCategoryLabel(share.vendor_category)
    : null;
  const arrival = formatTimeOfDay(share.arrival_time);
  const confirmed = Boolean(share.confirmed_at);

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow className="mb-3 block">
              {category ?? "Vendor"}
            </Eyebrow>
            <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink md:text-[42px]">
              {coupleNames}
            </h1>
            {dateLabel ? (
              <p className="mt-3 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                {dateLabel}
              </p>
            ) : (
              <p className="mt-3 text-[15px] font-medium text-muted">
                Date to be set
              </p>
            )}
          </div>
          {confirmed ? <Pill variant="sage">Confirmed</Pill> : null}
        </div>
        <p className="mt-4 text-[15px] font-medium text-muted">
          Shared with {share.vendor_name}
        </p>
        {share.location?.trim() ? (
          <p className="mt-1 text-[15px] font-medium text-ink">
            {share.location}
          </p>
        ) : null}
      </Card>

      {share.venues.length > 0 ? (
        <Card className="p-8">
          <Eyebrow className="mb-4 block">Venues</Eyebrow>
          <ul className="space-y-2">
            {share.venues.map((venue) => (
              <li
                key={venue.name}
                className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
              >
                <p className="text-[15px] font-medium text-ink">{venue.name}</p>
                {venue.address ? (
                  <p className="mt-0.5 text-[13px] text-muted">{venue.address}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {share.contacts.length > 0 ? (
        <Card className="p-8">
          <Eyebrow className="mb-4 block">Contact</Eyebrow>
          <ul className="space-y-2">
            {share.contacts.map((contact) => (
              <li
                key={`${contact.role}-${contact.name}`}
                className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
              >
                <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                  {contactRoleLabel(contact.role)}
                </p>
                <p className="mt-1 text-[15px] font-medium text-ink">
                  {contact.name}
                </p>
                {contact.email ? (
                  <a
                    href={`mailto:${contact.email}`}
                    className="mt-0.5 block text-[13px] font-medium text-accent no-underline hover:opacity-80"
                  >
                    {contact.email}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {(arrival || share.scope_note?.trim()) && (
        <Card className="p-8">
          <Eyebrow className="mb-4 block">Your day-of</Eyebrow>
          <div className="space-y-2">
            {arrival ? (
              <p className="text-[15px] font-medium text-ink">
                Arrive {arrival}
              </p>
            ) : null}
            {share.scope_note?.trim() ? (
              <p className="text-[15px] font-medium text-muted">
                {share.scope_note}
              </p>
            ) : null}
          </div>
        </Card>
      )}

      <Card className="p-8">
        <Eyebrow className="mb-4 block">Day-of timeline</Eyebrow>
        {share.timeline.length === 0 ? (
          <p className="text-[15px] font-medium text-muted">
            No day-of timeline yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {share.timeline.map((item, index) => {
              const when = formatTimeRange(item.start_time, item.end_time);
              return (
                <li
                  key={`${item.title}-${index}`}
                  className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
                >
                  {item.section ? (
                    <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                      {item.section}
                    </p>
                  ) : null}
                  <p className="text-[15px] font-medium text-ink">{item.title}</p>
                  {when ? (
                    <p className="mt-0.5 text-[13px] tabular-nums text-muted">
                      {when}
                    </p>
                  ) : null}
                  {item.owner ? (
                    <p className="mt-0.5 text-[13px] text-muted">{item.owner}</p>
                  ) : null}
                  {item.description ? (
                    <p className="mt-1 text-[13px] text-muted">{item.description}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-8">
        <Eyebrow className="mb-4 block">Your payments</Eyebrow>
        {share.quoted_price != null ? (
          <p className="mb-3 text-[15px] font-medium tabular-nums text-ink">
            Quoted {formatCurrency(share.quoted_price)}
          </p>
        ) : null}
        {share.payments.length === 0 ? (
          <p className="text-[15px] font-medium text-muted">
            No payment dates linked yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {share.payments.map((row, index) => (
              <li
                key={`${row.due_on}-${index}`}
                className="flex items-start justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink">
                    {row.label?.trim() || "Payment"}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {formatEyebrowDate(row.due_on)}
                  </p>
                </div>
                <span className="shrink-0 text-[15px] font-medium tabular-nums text-ink">
                  {formatCurrency(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-8">
        <TokenVendorShareInbox
          token={token}
          messages={messages}
          ownerLabel={coupleNames}
          vendorLabel={share.vendor_name}
        />
      </Card>

      <Card className="p-8">
        <Eyebrow className="mb-3 block">Save</Eyebrow>
        <SaveVendorShareControl token={token} status={claimStatus} />
      </Card>

      {confirmed ? (
        <p className="rounded-[var(--radius-card)] bg-surface px-8 py-4 text-center text-[15px] font-medium text-sage shadow-raised">
          You&apos;re confirmed for this wedding.
        </p>
      ) : (
        <Card className="p-8">
          <Eyebrow className="mb-3 block">Arrival</Eyebrow>
          <p className="mb-4 text-[15px] font-medium text-muted">
            Let them know you&apos;ll be there.
          </p>
          <ConfirmVendorShareButton token={token} />
        </Card>
      )}
    </div>
  );
}

export default async function PublicVendorSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const decoded = decodeURIComponent(token);
  const share = await getPublicVendorShare(decoded);

  if (!share) {
    return (
      <ShareShell>
        <InvalidLink />
      </ShareShell>
    );
  }

  const [messages, claimStatus] = await Promise.all([
    listPublicVendorShareMessages(decoded),
    getVendorShareClaimStatus(decoded),
  ]);

  return (
    <ShareShell>
      <SharePage
        share={share}
        token={decoded}
        messages={messages ?? []}
        claimStatus={claimStatus}
      />
    </ShareShell>
  );
}
