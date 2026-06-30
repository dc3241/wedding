import Link from "next/link";
import { Card } from "@/components/ui/card";

type PlannerProject = {
  id: string;
  name: string;
  wedding_date: string | null;
};

function formatWeddingDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(date: string | null) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = new Date(date + "T00:00:00");
  wedding.setHours(0, 0, 0, 0);
  return Math.round((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function countdownLabel(days: number | null) {
  if (days === null) return "—";
  if (days > 0) return `${days}d`;
  if (days === 0) return "Today";
  return `${Math.abs(days)}d ago`;
}

export function PlannerProjectsTable({
  projects,
}: {
  projects: PlannerProject[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse">
          <thead>
            <tr>
              <th className="border-b border-stone px-3 pb-2.5 text-left text-xs font-medium tracking-[0.04em] text-ink-muted">
                Wedding
              </th>
              <th className="border-b border-stone px-3 pb-2.5 text-left text-xs font-medium tracking-[0.04em] text-ink-muted">
                Date
              </th>
              <th className="border-b border-stone px-3 pb-2.5 text-right text-xs font-medium tracking-[0.04em] text-ink-muted">
                Countdown
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => {
              const weddingDate = formatWeddingDate(project.wedding_date);
              const days = daysUntil(project.wedding_date);

              return (
                <tr
                  key={project.id}
                  className="border-b border-stone last:border-b-0 hover:bg-stone-soft"
                >
                  <td className="px-3 py-3 text-sm">
                    <Link
                      href={`/projects/${project.id}`}
                      className="couple-name text-[21px] text-ink hover:text-plum-deep"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="tabnum whitespace-nowrap px-3 py-3 text-sm text-ink-muted">
                    {weddingDate ?? "No date set"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm">
                    {days !== null && days >= 0 ? (
                      <span className="tabnum font-medium text-plum">
                        {countdownLabel(days)}
                      </span>
                    ) : (
                      <span className="tabnum text-ink-muted">
                        {countdownLabel(days)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
