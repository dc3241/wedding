import { PLAN_TOOLS } from "@/lib/plan-tools";
import Link from "next/link";

/** MEDIA-01: free tools first, then app guides. Shared by "/" and /plan. */
export function PlanToolGrid({ limit }: { limit?: number }) {
  const tools = PLAN_TOOLS.filter((t) => t.kind === "tool");
  const guides = PLAN_TOOLS.filter((t) => t.kind === "guide");
  const shownGuides = limit ? guides.slice(0, Math.max(0, limit - tools.length)) : guides;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[18px] font-bold text-ink">Use it now, no sign-up</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className="marketing-card-hover flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-5 no-underline shadow-raised"
              >
                <span className="text-[16px] font-extrabold tracking-[-0.01em] text-ink">{t.title}</span>
                <span className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-muted">{t.body}</span>
                <span className="mt-3 text-[13.5px] font-semibold text-accent">Open →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {shownGuides.length ? (
        <div>
          <h2 className="text-[18px] font-bold text-ink">Planning guides</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {shownGuides.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="marketing-card-hover flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-5 no-underline shadow-raised"
                >
                  <span className="text-[15px] font-bold text-ink">{t.title}</span>
                  <span className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-muted">{t.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
