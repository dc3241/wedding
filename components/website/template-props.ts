import type { ReactNode } from "react";
import type { WeddingWebsiteContent } from "./types";

/** Shared props for all Tier 3 wedding templates. */
export type WeddingTemplateProps = {
  content: WeddingWebsiteContent;
  theme: string;
  /** When set, show a Registry nav link to the public sub-page. */
  registryHref?: string | null;
  /** When set, show a Home nav link (registry sub-page). */
  homeHref?: string | null;
  /**
   * When set, replace the home body sections with this slot
   * (hero / chrome still render — do not duplicate the hero).
   */
  pageSlot?: ReactNode;
};
