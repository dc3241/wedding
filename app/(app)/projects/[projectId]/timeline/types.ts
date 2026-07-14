export type { TimelineEvent } from "@/lib/timeline-aggregates";
export {
  formatTimeOfDay,
  formatTimeRange,
} from "@/lib/timeline-aggregates";

export function timeInputValue(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}
