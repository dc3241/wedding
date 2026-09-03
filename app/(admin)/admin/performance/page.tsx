import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getScheduleWeeks } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

function num(value: string | null | undefined) {
  if (!value) return null;
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export default async function AdminPerformancePage() {
  const supabase = await createClient();
  const weeks = await getScheduleWeeks(supabase);

  const logged = [...weeks]
    .reverse()
    .filter(
      (w) =>
        w.performance &&
        (w.performance.views || w.performance.dms || w.performance.signups || w.performance.follower_growth),
    );

  const totalDms = logged.reduce((n, w) => n + (num(w.performance?.dms) ?? 0), 0);
  const totalSignups = logged.reduce((n, w) => n + (num(w.performance?.signups) ?? 0), 0);

  return (
    <div>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.01em] text-ink">
        Performance
      </h1>
      <p className="mb-5 text-[13.5px] text-muted">
        Weekly performance, most recent first. Log new numbers from the Schedule tab — this is
        the read-only trend view.
      </p>

      {logged.length === 0 ? (
        <EmptyState>No performance logged yet — add numbers from the Schedule tab.</EmptyState>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3.5 md:grid-cols-4">
            <Card className="px-5 py-4">
              <div className="mb-1.5 text-[12px] text-muted">Weeks logged</div>
              <div className="font-serif text-[28px] font-semibold text-ink">
                {logged.length}
              </div>
            </Card>
            <Card className="px-5 py-4">
              <div className="mb-1.5 text-[12px] text-muted">Latest views</div>
              <div className="font-serif text-[28px] font-semibold text-ink">
                {logged[0]?.performance?.views || "—"}
              </div>
            </Card>
            <Card className="px-5 py-4">
              <div className="mb-1.5 text-[12px] text-muted">Total DMs (logged)</div>
              <div className="font-serif text-[28px] font-semibold text-ink">{totalDms || "—"}</div>
            </Card>
            <Card className="px-5 py-4">
              <div className="mb-1.5 text-[12px] text-muted">Total sign-ups (logged)</div>
              <div className="font-serif text-[28px] font-semibold text-ink">
                {totalSignups || "—"}
              </div>
            </Card>
          </div>

          <Card className="overflow-x-auto px-5 py-5">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  {["Week", "Views", "Follower growth", "DMs", "Sign-ups", "What drove it"].map(
                    (h) => (
                      <th
                        key={h}
                        className="border-b-[1.5px] border-hairline px-2 pb-2 text-left text-[11px] font-semibold tracking-[0.03em] text-muted uppercase"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {logged.map((week) => (
                  <tr key={week.id}>
                    <td className="border-b border-hairline px-2 py-2 font-semibold whitespace-nowrap">
                      {week.label}
                    </td>
                    <td className="border-b border-hairline px-2 py-2">
                      {week.performance?.views || "—"}
                    </td>
                    <td className="border-b border-hairline px-2 py-2">
                      {week.performance?.follower_growth || "—"}
                    </td>
                    <td className="border-b border-hairline px-2 py-2">
                      {week.performance?.dms || "—"}
                    </td>
                    <td className="border-b border-hairline px-2 py-2">
                      {week.performance?.signups || "—"}
                    </td>
                    <td className="max-w-[280px] border-b border-hairline px-2 py-2 text-muted">
                      {week.performance?.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
