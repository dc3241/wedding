import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";
import type { ContentPillar } from "@/lib/admin/content-pillars";

export function PillarGrid({ pillars }: { pillars: ContentPillar[] }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
      {pillars.map((pillar) => (
        <Card
          key={pillar.name}
          className={cn("px-5 py-[19px] md:px-[22px]", pillar.span && "md:col-span-2")}
        >
          <div className="mb-2.5 flex items-center gap-2 font-sans text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            {pillar.name}
            {pillar.isNew ? <Pill variant="sage">New</Pill> : null}
          </div>
          <ul className="list-disc space-y-0.5 pl-[18px] text-[13.5px] leading-[1.75] text-ink">
            {pillar.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
