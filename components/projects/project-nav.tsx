"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Checklist", segment: "checklist" },
  { label: "Vendors", segment: "vendors" },
] as const;

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className="flex gap-1 border-b border-zinc-200">
      {tabs.map(({ label, segment }) => {
        const href = `${base}/${segment}`;
        const active =
          pathname === href ||
          pathname.startsWith(`${href}/`) ||
          (segment === "checklist" && pathname === base);

        return (
          <Link
            key={segment}
            href={href}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
