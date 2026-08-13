"use client";

import Link from "next/link";
import {
  parseLocalDateKey,
  toLocalDateKey,
} from "@/app/(app)/calendar/calendar-source";
import type { WeddingCardModel } from "@/lib/dashboard-aggregates";

function coupleInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  const pair = trimmed.match(/^(.+?)\s*(?:&|and)\s*(.+)$/i);
  if (pair) {
    const a = pair[1].trim().charAt(0);
    const b = pair[2].trim().charAt(0);
    return `${a}${b}`.toUpperCase();
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/** Short en-US label via the same local-date parse as countdown/calendar. */
function formatShortLocalDate(iso: string): string {
  return parseLocalDateKey(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Whole local-date days from today → wedding (can be negative if past). */
function localDaysUntil(iso: string): number {
  const today = parseLocalDateKey(toLocalDateKey(new Date()));
  const wedding = parseLocalDateKey(iso);
  return Math.round(
    (wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function CalendarGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  );
}

function WeddingCard({
  card,
  onArchive,
  archiveDisabled,
}: {
  card: WeddingCardModel;
  onArchive: () => void;
  archiveDisabled: boolean;
}) {
  const hasDate = card.weddingDate != null;
  const days = hasDate ? localDaysUntil(card.weddingDate!) : null;
  const total = card.tasksTotal;
  const donePct = total === 0 ? 0 : (card.tasksDone / total) * 100;
  const overduePct = total === 0 ? 0 : (card.tasksOverdue / total) * 100;

  return (
    <article className="flex flex-col gap-3.5 rounded-[var(--radius-card)] bg-surface p-5 shadow-raised">
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-pill)] bg-well text-[14px] font-semibold tracking-[0.02em] text-muted"
          aria-hidden
        >
          {coupleInitials(card.name)}
        </div>
        <div className="min-w-0 truncate text-[16px] font-semibold tracking-[-0.01em] text-ink">
          {card.name}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
          <span className="text-muted">
            <CalendarGlyph />
          </span>
          {hasDate ? formatShortLocalDate(card.weddingDate!) : "Date not set"}
        </span>
        {days !== null ? (
          <span className="rounded-[var(--radius-pill)] bg-well px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-ink shadow-recessed">
            in {Math.max(0, days)} day{Math.max(0, days) === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <p className="text-[13px] font-medium text-muted">
        <strong className="font-semibold text-ink tabular-nums">
          {card.confirmedGuests}
        </strong>{" "}
        confirmed guests
      </p>

      <div className="flex flex-col gap-1.5">
        <div
          className="flex h-2 overflow-hidden rounded-[var(--radius-pill)] bg-well shadow-recessed"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={card.tasksDone}
          aria-label={
            total === 0
              ? "No tasks yet"
              : `${card.tasksDone} of ${total} tasks done`
          }
        >
          {total > 0 && donePct > 0 ? (
            <div
              className="h-full bg-sage"
              style={{ width: `${donePct}%` }}
            />
          ) : null}
          {total > 0 && card.tasksOverdue > 0 && overduePct > 0 ? (
            <div
              className="h-full bg-rosewood"
              style={{ width: `${overduePct}%` }}
            />
          ) : null}
        </div>
        <p className="text-[12px] font-medium tabular-nums text-muted">
          {total === 0 ? (
            "No tasks yet"
          ) : (
            <>
              {card.tasksDone}/{total} tasks done
              {card.tasksOverdue > 0 ? (
                <>
                  {" · "}
                  <span className="font-semibold text-rosewood">
                    {card.tasksOverdue} overdue
                  </span>
                </>
              ) : null}
            </>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 pt-0.5">
        <button
          type="button"
          disabled={archiveDisabled}
          onClick={onArchive}
          className="cursor-pointer border-none bg-transparent text-[13px] font-medium text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Archive
        </button>
        <Link
          href={`/projects/${card.id}`}
          className="text-[13px] font-semibold text-accent no-underline transition-opacity hover:opacity-80"
        >
          Enter →
        </Link>
      </div>
    </article>
  );
}

export function WeddingCards({
  cards,
  onArchive,
  archiveDisabled,
}: {
  cards: WeddingCardModel[];
  onArchive: (card: WeddingCardModel) => void;
  archiveDisabled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-[18px] min-[720px]:grid-cols-2">
      {cards.map((card) => (
        <WeddingCard
          key={card.id}
          card={card}
          archiveDisabled={archiveDisabled}
          onArchive={() => onArchive(card)}
        />
      ))}
    </div>
  );
}
