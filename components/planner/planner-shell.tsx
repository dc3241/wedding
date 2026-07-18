import { PlannerProjectSidebar } from "@/components/planner/planner-project-sidebar";
import type { SidebarProject } from "@/components/planner/planner-project-sidebar";
import { Wordmark } from "@/components/ui/topbar";
import type { ReactNode } from "react";

export function PlannerShell({
  children,
  projects,
}: {
  children: ReactNode;
  projects: SidebarProject[];
}) {
  return (
    <div className="flex min-h-full flex-col bg-canvas">
      <header className="sticky top-0 z-10 flex items-center border-b border-hairline bg-canvas px-8 py-[18px]">
        <Wordmark />
      </header>
      <div className="flex flex-1 gap-6 px-8 py-7">
        <PlannerProjectSidebar projects={projects} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
