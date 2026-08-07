import Link from "next/link";
import { AskAssistantPrompt } from "@/components/assistant/AskAssistantPrompt";
import { ASSISTANT_PREFILLS } from "@/components/assistant/prefills";
import { WeddingDateEditor } from "@/components/ui/wedding-date-editor";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { vendorStatusPill } from "@/components/vendors/vendor-status";
import {
  daysUntilWedding,
  overviewDuePill,
  type OverviewData,
  type OverviewPaidTone,
} from "@/components/dashboard/overview-data";
import { formatCurrency } from "@/lib/format-currency";
import { projectTabHref } from "@/lib/project-tabs";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/** Work-step launcher for personal owners — excludes Overview + Calendar. */
const SUGGESTED_PATH_STEPS = [
  { label: "Checklist", segment: "checklist" },
  { label: "Budget", segment: "budget" },
  { label: "Vendors", segment: "vendors" },
  { label: "Guests", segment: "guests" },
  { label: "Website", segment: "website" },
  { label: "Seating", segment: "seating" },
  { label: "Day-of timeline", segment: "timeline" },
  { label: "Notes & files", segment: "notes" },
] as const;

function formatShortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLongWeekdayDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatLastContact(iso: string | null | undefined) {
  if (!iso) return "—";
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const contactDay = new Date(date);
  contactDay.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - contactDay.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function LoadError({ label }: { label: string }) {
  return (
    <p className="text-[15px] font-medium text-rosewood">
      Couldn&apos;t load {label}.
    </p>
  );
}

function ProgressBar({
  percent,
  fill,
  label,
}: {
  percent: number;
  fill: "sage" | "accent" | "rosewood";
  label: string;
}) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="mt-4 h-2 overflow-hidden rounded-[var(--radius-pill)] bg-well shadow-recessed"
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      {width > 0 ? (
        <div
          className={cn(
            "h-full rounded-[var(--radius-pill)] transition-[width] duration-300",
            fill === "sage" && "bg-sage",
            fill === "accent" && "bg-accent",
            fill === "rosewood" && "bg-rosewood",
          )}
          style={{ width: `${width}%` }}
        />
      ) : null}
    </div>
  );
}

function OverviewStatCard({
  label,
  value,
  footer,
  children,
  href,
  error,
}: {
  label: string;
  value?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  href?: string;
  error?: ReactNode;
}) {
  const body = (
    <Card className="flex min-h-[150px] flex-col px-6 py-5 shadow-raised">
      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        {label}
      </p>
      {error ? (
        error
      ) : (
        <>
          <div className="font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] tabular-nums text-ink md:text-[52px]">
            {value}
          </div>
          {children}
          {footer ? (
            <div className="mt-auto pt-3.5 text-[13px] font-medium text-muted">
              {footer}
            </div>
          ) : null}
        </>
      )}
    </Card>
  );

  if (!href || error) return body;

  return (
    <Link
      href={href}
      className="block no-underline transition-opacity hover:opacity-90"
    >
      {body}
    </Link>
  );
}

function paidClass(tone: OverviewPaidTone) {
  if (tone === "full") return "font-bold text-sage";
  if (tone === "part") return "font-bold text-clay";
  if (tone === "none") return "font-medium text-muted";
  return "text-muted";
}

/**
 * Shared project Overview surface — composed into CoupleDashboard and
 * PlannerDashboard (DASH-02). Tier 1 Soft stack only.
 */
export function ProjectOverview({
  data,
  showLastContact = false,
  isPersonalOwner = false,
}: {
  data: OverviewData;
  /** Planner outreach table keeps Last contact. */
  showLastContact?: boolean;
  /** Personal account owner only — not business, not no-account collaborators. */
  isPersonalOwner?: boolean;
}) {
  const {
    projectId,
    weddingDate,
    todayKey,
    totalBudget,
    paidTotal,
    checklist,
    rsvp,
    nextPayment,
    allInstallmentsCovered,
    attention,
    vendorRows,
    errors,
  } = data;

  const budgetOver =
    totalBudget != null && totalBudget > 0 && paidTotal > totalBudget;
  const budgetPct =
    totalBudget != null && totalBudget > 0
      ? Math.min(
          100,
          Math.round((paidTotal / totalBudget) * 100),
        )
      : 0;
  // Cap display width at 100; over-budget flips fill color.
  const budgetBarPct = budgetOver ? 100 : budgetPct;
  const budgetFill = budgetOver ? "rosewood" : "accent";

  const countdownError = errors.project;
  const checklistError = errors.tasks;
  const budgetError = errors.project || errors.payments;
  const rsvpError = errors.guests;
  const paymentError = errors.schedule || errors.payments || errors.budgetItems;
  const attentionError = errors.tasks;
  const vendorsError = errors.vendors;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewStatCard
          label="Countdown"
          error={countdownError ? <LoadError label="countdown" /> : undefined}
          value={
            weddingDate ? (
              <>
                {daysUntilWedding(weddingDate, todayKey)}
                <small className="ml-1.5 text-[22px] font-semibold tracking-[-0.02em] text-muted">
                  days
                </small>
              </>
            ) : (
              <WeddingDateEditor
                projectId={projectId}
                weddingDate={weddingDate}
                className="text-[15px]"
              />
            )
          }
          footer={
            weddingDate ? formatLongWeekdayDate(weddingDate) : undefined
          }
        />

        <OverviewStatCard
          label="Checklist progress"
          href={`/projects/${projectId}/checklist`}
          error={
            checklistError ? <LoadError label="checklist" /> : undefined
          }
          value={
            <>
              {checklist.percent}
              <small className="ml-0.5 text-[22px] font-semibold tracking-[-0.02em] text-muted">
                %
              </small>
            </>
          }
          footer={`${checklist.done} of ${checklist.total} tasks done`}
        >
          <ProgressBar
            percent={checklist.percent}
            fill="sage"
            label={`${checklist.percent}% of checklist complete`}
          />
        </OverviewStatCard>

        <OverviewStatCard
          label="Budget"
          href={`/projects/${projectId}/budget`}
          error={budgetError ? <LoadError label="budget" /> : undefined}
          value={formatCurrency(paidTotal)}
          footer={
            totalBudget != null
              ? `of ${formatCurrency(totalBudget)} · ${budgetPct}% spent`
              : "of —"
          }
        >
          <ProgressBar
            percent={budgetBarPct}
            fill={budgetFill}
            label={
              budgetOver
                ? `Paid ${formatCurrency(paidTotal)} — over budget`
                : `Paid ${formatCurrency(paidTotal)}${
                    totalBudget != null
                      ? ` of ${formatCurrency(totalBudget)}`
                      : ""
                  }`
            }
          />
        </OverviewStatCard>

        <OverviewStatCard
          label="RSVPs"
          href={`/projects/${projectId}/guests`}
          error={rsvpError ? <LoadError label="RSVPs" /> : undefined}
          value={
            <>
              {rsvp.responded}
              <small className="ml-1.5 text-[22px] font-semibold tracking-[-0.02em] text-muted">
                of {rsvp.total}
              </small>
            </>
          }
        >
          {rsvp.total === 0 ? null : (
            <ul className="mt-3.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] font-medium text-muted">
              <li>
                <span
                  className="mr-1.5 inline-block size-2 rounded-full bg-sage align-middle"
                  aria-hidden
                />
                <b className="font-bold text-ink">{rsvp.attending}</b> yes
              </li>
              <li>
                <span
                  className="mr-1.5 inline-block size-2 rounded-full bg-rosewood align-middle"
                  aria-hidden
                />
                <b className="font-bold text-ink">{rsvp.declined}</b> no
              </li>
              <li>
                <span
                  className="mr-1.5 inline-block size-2 rounded-full bg-ring align-middle"
                  aria-hidden
                />
                <b className="font-bold text-ink">{rsvp.pending}</b> open
              </li>
            </ul>
          )}
        </OverviewStatCard>
      </div>

      <Card className="px-5 py-4 sm:px-6 sm:py-[18px]">
        <AskAssistantPrompt
          prefill={ASSISTANT_PREFILLS.overview}
          title="What should I tackle next?"
          description="I'll look at what's already set up and suggest the highest-leverage next step."
          cta="Ask assistant"
        />
        {isPersonalOwner ? (
          <div className="mt-4 rounded-[var(--radius-inner)] bg-well px-4 py-4 shadow-recessed">
            <p className="text-[15px] font-semibold text-ink">
              New here? We suggest working through in this order.
            </p>
            <p className="mt-0.5 text-[13px] font-medium text-muted">
              A recommended path — jump in wherever you are.
            </p>
            <ol className="mt-3 flex list-none flex-col gap-1.5 p-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-1 sm:gap-y-2">
              {SUGGESTED_PATH_STEPS.map((step, index) => (
                <li
                  key={step.segment}
                  className="flex items-center gap-1.5 text-[14px] font-medium"
                >
                  {index > 0 ? (
                    <span
                      className="hidden text-muted sm:inline"
                      aria-hidden
                    >
                      →
                    </span>
                  ) : null}
                  <Link
                    href={projectTabHref(projectId, step.segment)}
                    className="rounded-[var(--radius-pill)] px-2.5 py-1 text-accent no-underline transition-opacity hover:bg-accent-wash hover:opacity-90"
                  >
                    {step.label}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="px-6 py-[22px]">
          <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Next payment due
          </h2>
          <p className="mt-1 text-[13px] font-medium text-muted">
            The soonest installment not yet covered by the ledger.
          </p>

          {paymentError ? (
            <div className="mt-4">
              <LoadError label="payment schedule" />
            </div>
          ) : nextPayment ? (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[var(--radius-inner)] bg-well px-[18px] py-4 shadow-recessed">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink">
                    {nextPayment.primary}
                  </p>
                  <p className="mt-0.5 text-[13px] font-medium text-muted">
                    {nextPayment.label?.trim()
                      ? `${nextPayment.label.trim()} · `
                      : ""}
                    due {formatShortDate(nextPayment.due_on)}
                  </p>
                </div>
                <p className="font-display text-[30px] font-extrabold tracking-[-0.03em] tabular-nums text-ink">
                  {formatCurrency(nextPayment.amount)}
                </p>
                {(() => {
                  const pill = overviewDuePill(
                    nextPayment.due_on,
                    todayKey,
                    nextPayment.pastDue,
                  );
                  return (
                    <span
                      className={cn(
                        "rounded-[var(--radius-pill)] px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.04em]",
                        pill.urgent
                          ? "bg-rosewood-wash text-rosewood"
                          : "bg-clay-wash text-clay",
                      )}
                    >
                      {pill.label}
                    </span>
                  );
                })()}
              </div>
              {nextPayment.moreThisQuarter.count > 0 ? (
                <p className="mt-3 text-[13px] font-medium text-muted">
                  {nextPayment.moreThisQuarter.count} more installment
                  {nextPayment.moreThisQuarter.count === 1 ? "" : "s"}{" "}
                  scheduled this quarter ·{" "}
                  {formatCurrency(nextPayment.moreThisQuarter.total)} upcoming
                </p>
              ) : (
                <p className="mt-3 text-[13px] font-medium text-muted">
                  No other installments left this quarter.
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 text-[15px] font-medium text-muted">
              {allInstallmentsCovered
                ? "All installments covered."
                : "No payments scheduled."}{" "}
              <Link
                href={`/projects/${projectId}/budget`}
                className="font-semibold text-accent no-underline hover:opacity-80"
              >
                Open Budget schedule
              </Link>
            </p>
          )}
        </Card>

        <Card className="px-6 py-[22px]">
          <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Needs attention
          </h2>
          <p className="mt-1 text-[13px] font-medium text-muted">
            Overdue tasks and anything off track.
          </p>

          {attentionError ? (
            <div className="mt-4">
              <LoadError label="tasks" />
            </div>
          ) : attention.length === 0 ? (
            <p className="mt-4 text-[15px] font-medium text-muted">
              Nothing overdue — you&apos;re on track.
            </p>
          ) : (
            <ul className="mt-2">
              {attention.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 border-b border-hairline py-3 last:border-b-0 last:pb-0"
                >
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      item.tone === "rosewood" ? "bg-rosewood" : "bg-clay",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink">
                      {item.title}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[13px] font-semibold",
                        item.tone === "rosewood"
                          ? "text-rosewood"
                          : "text-clay",
                      )}
                    >
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden px-6 pb-2 pt-[22px]">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Vendor outreach
          </h2>
          <ButtonLink
            href={`/projects/${projectId}/vendors`}
            className="ml-auto px-[18px] py-2.5 text-[13.5px]"
          >
            Draft outreach
          </ButtonLink>
        </div>

        {vendorsError ? (
          <div className="pb-5">
            <LoadError label="vendors" />
          </div>
        ) : vendorRows.length === 0 ? (
          <div className="pb-5">
            <p className="text-[15px] font-medium text-muted">
              No vendors on this wedding yet. Search or add vendors to start
              outreach.
            </p>
            <AskAssistantPrompt
              className="mt-4 max-w-md"
              prefill={ASSISTANT_PREFILLS.vendors}
              title="Ask what to book first"
              description="Priority categories and what to look for when shortlisting."
              cta="Find vendors"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse">
              <thead>
                <tr>
                  {(
                    [
                      "Vendor",
                      "Stage",
                      "Paid",
                      "Quote",
                      ...(showLastContact ? (["Last contact"] as const) : []),
                      "Next step",
                    ] as const
                  ).map((heading) => (
                    <th
                      key={heading}
                      className={cn(
                        "border-b border-hairline px-3 pb-2.5 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted",
                        heading === "Quote" ? "text-right" : "text-left",
                      )}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendorRows.map((row) => {
                  const { vendor, paid, quote, paidTone, nextStep } = row;
                  const pill = vendorStatusPill(
                    vendor.status,
                    vendor.quoted_price,
                  );

                  return (
                    <tr
                      key={vendor.id}
                      className="border-b border-hairline last:border-b-0 hover:bg-well"
                    >
                      <td className="px-3 py-3 align-middle text-[14px]">
                        <Link
                          href={`/projects/${projectId}/vendors/${vendor.vendor.id}`}
                          className="font-medium text-ink hover:text-accent"
                        >
                          {vendor.vendor.name}
                        </Link>
                        {vendor.vendor.category ? (
                          <div className="mt-0.5 text-[12px] text-muted">
                            {vendorCategoryLabel(vendor.vendor.category)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 align-middle">
                        {vendor.status === "booked" ? (
                          <span className="inline-flex items-center whitespace-nowrap rounded-[var(--radius-pill)] bg-sage-wash px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.03em] text-sage">
                            {pill.label}
                          </span>
                        ) : (
                          <Pill variant={pill.variant}>{pill.label}</Pill>
                        )}
                      </td>
                      <td className="px-3 py-3 align-middle text-[14px] tabular-nums">
                        {paidTone === "empty" || paid == null ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <span className={paidClass(paidTone)}>
                            {formatCurrency(paid)}
                            {quote != null ? (
                              <span className="font-medium text-muted">
                                {" "}
                                / {formatCurrency(quote)}
                              </span>
                            ) : null}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right align-middle text-[14px] tabular-nums text-ink">
                        {quote != null ? (
                          formatCurrency(quote)
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      {showLastContact ? (
                        <td className="px-3 py-3 align-middle text-[14px] tabular-nums text-ink">
                          {formatLastContact(vendor.lastContact)}
                        </td>
                      ) : null}
                      <td className="px-3 py-3 align-middle text-[14px]">
                        {nextStep ? (
                          <Link
                            href={
                              vendor.status === "booked"
                                ? `/projects/${projectId}/budget`
                                : `/projects/${projectId}/vendors`
                            }
                            className="font-semibold text-accent no-underline hover:opacity-80"
                          >
                            {nextStep}
                          </Link>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
