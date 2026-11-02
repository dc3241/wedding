import type { ReactNode } from "react";

/**
 * Stroke icons for the couple sidebar. Same 20×20 / 1.6 stroke grammar as
 * the planner rail (planner-project-sidebar.tsx) so the two rails read as
 * one system.
 */
export function RailIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-[19px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const overview = <path d="M3 9.5 10 3l7 6.5M5 8.5V17h10V8.5M8 17v-5h4v5" />;
const calendar = (
  <>
    <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
    <path d="M3 8.5h14M7 2.5v4M13 2.5v4" />
  </>
);
const checklist = (
  <>
    <path d="M8.5 5.5h8M8.5 10h8M8.5 14.5h8" />
    <path d="m3 5.5 1.2 1.2L6.3 4.5M3 10l1.2 1.2L6.3 9M3 14.5l1.2 1.2 2.1-2.2" />
  </>
);
const budget = (
  <>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6.5v7M12.5 8.2c-.5-.7-1.3-1-2.5-1s-2 .4-2 1.5 1 1.4 2.5 1.7 2.5.6 2.5 1.8-1 1.5-2.5 1.5-2.1-.4-2.5-1.1" />
  </>
);
const vendors = (
  <>
    <path d="M3.5 8.5 5 4.5h10l1.5 4" />
    <path d="M3.5 8.5V16a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8.5" />
    <path d="M8 17v-4.5h4V17" />
  </>
);
const guests = (
  <>
    <circle cx="7" cy="7.5" r="2.5" />
    <circle cx="13.5" cy="8" r="2" />
    <path d="M2.5 16.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M12 12.5c1.8 0 3.5 1 3.5 3" />
  </>
);
const website = (
  <>
    <circle cx="10" cy="10" r="7" />
    <path d="M3 10h14M10 3c2 2 2.8 4.4 2.8 7S12 15 10 17c-2-2-2.8-4.4-2.8-7S8 5 10 3Z" />
  </>
);
const seating = (
  <>
    <circle cx="10" cy="10" r="3.5" />
    <circle cx="10" cy="3.5" r="1.2" />
    <circle cx="10" cy="16.5" r="1.2" />
    <circle cx="3.5" cy="10" r="1.2" />
    <circle cx="16.5" cy="10" r="1.2" />
  </>
);
const timeline = (
  <>
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6v4l2.5 2" />
  </>
);
const contracts = (
  <>
    <path d="M6 3.5h5.5L15.5 7v9.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" />
    <path d="M11.5 3.5V7H15.5M7.5 10.5h5M7.5 13.5h5" />
  </>
);
const notes = (
  <>
    <path d="M5 3.5h10a1 1 0 0 1 1 1V13l-4 4H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
    <path d="M12 17v-3a1 1 0 0 1 1-1h3M7 7.5h6M7 10.5h4" />
  </>
);
const fallback = <circle cx="10" cy="10" r="6.5" />;

const SECTION_ICONS: Record<string, ReactNode> = {
  "": overview,
  calendar,
  checklist,
  budget,
  vendors,
  guests,
  website,
  seating,
  timeline,
  agreements: contracts,
  contracts,
  invoices: contracts,
  notes,
  access: guests,
};

export function sectionIcon(segment: string): ReactNode {
  return SECTION_ICONS[segment] ?? fallback;
}

export const customizeIcon = (
  <>
    <path d="M4 5.5h7M15 5.5h1M4 10h2M10 10h6M4 14.5h8M16 14.5h0" />
    <circle cx="13" cy="5.5" r="1.8" />
    <circle cx="8" cy="10" r="1.8" />
    <circle cx="14" cy="14.5" r="1.8" />
  </>
);

export const billingIcon = (
  <>
    <rect x="2.5" y="5" width="15" height="10.5" rx="1.5" />
    <path d="M2.5 8.5h15M6 12.5h3" />
  </>
);

export const contactIcon = (
  <>
    <rect x="3" y="4.5" width="14" height="11" rx="1.5" />
    <path d="M3.5 6.5 10 11l6.5-4.5" />
  </>
);

export const logoutIcon = (
  <path d="M8 3.5H4.5A1.5 1.5 0 0 0 3 5v10a1.5 1.5 0 0 0 1.5 1.5H8M12.5 13.5 16 10l-3.5-3.5M16 10H8" />
);

export const weddingIcon = (
  <>
    <circle cx="7.5" cy="11.5" r="4" />
    <circle cx="12.5" cy="11.5" r="4" />
    <path d="M8.5 3.5h3l-1.5 2.5Z" />
  </>
);

export const collapseIcon = (
  <svg
    viewBox="0 0 20 20"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12.5 4 7 10l5.5 6" />
  </svg>
);

export const menuIcon = (
  <svg
    viewBox="0 0 20 20"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    aria-hidden
  >
    <path d="M3 5.5h14M3 10h14M3 14.5h14" />
  </svg>
);
