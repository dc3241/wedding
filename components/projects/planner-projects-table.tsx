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
              <th className="border-b border-hairline px-3 pb-2.5 text-left text-xs font-medium tracking-[0.04em] text-muted">
                Wedding
              </th>
              <th className="border-b border-hairline px-3 pb-2.5 text-left text-xs font-medium tracking-[0.04em] text-muted">
                Date
              </th>
              <th className="border-b border-hairline px-3 pb-2.5 text-right text-xs font-medium tracking-[0.04em] text-muted">
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
                  className="border-b border-hairline last:border-b-0 hover:bg-well"
                >
                  <td className="px-3 py-3 text-sm">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-[19px] font-extrabold tracking-[-0.02em] text-ink hover:text-accent"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="tabnum whitespace-nowrap px-3 py-3 text-sm tabular-nums text-muted">
                    {weddingDate ?? "No date set"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm">
                    {days !== null && days >= 0 ? (
                      <span className="tabnum font-medium tabular-nums text-accent">
                        {countdownLabel(days)}
                      </span>
                    ) : (
                      <span className="tabnum tabular-nums text-muted">
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
