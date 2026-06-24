"use client";

import { useTransition } from "react";
import { updateProjectVendorStatus } from "@/app/(app)/projects/[projectId]/vendors/actions";

type ProjectVendorStatus =
  | "to_contact"
  | "contacted"
  | "booked"
  | "declined";

const STATUS_CYCLE: Record<ProjectVendorStatus, ProjectVendorStatus> = {
  to_contact: "contacted",
  contacted: "booked",
  booked: "declined",
  declined: "to_contact",
};

const STATUS_LABEL: Record<ProjectVendorStatus, string> = {
  to_contact: "To contact",
  contacted: "Contacted",
  booked: "Booked",
  declined: "Declined",
};

const STATUS_PILL: Record<ProjectVendorStatus, string> = {
  to_contact: "bg-amber-50 text-amber-800",
  contacted: "bg-blue-50 text-blue-700",
  booked: "bg-green-50 text-green-700",
  declined: "bg-red-50 text-red-700",
};

export function VendorDetailStatus({
  projectVendorId,
  status,
}: {
  projectVendorId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const typedStatus = status as ProjectVendorStatus;

  function handleClick() {
    const next = STATUS_CYCLE[typedStatus] ?? "to_contact";
    startTransition(async () => {
      await updateProjectVendorStatus(projectVendorId, next);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_PILL[typedStatus] ?? STATUS_PILL.to_contact} disabled:opacity-50`}
    >
      {STATUS_LABEL[typedStatus] ?? status}
    </button>
  );
}
