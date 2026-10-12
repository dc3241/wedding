import "server-only";

import {
  parseHiddenTools,
  type HideableTool,
} from "@/lib/event-type";
import { createClient } from "@/utils/supabase/server";

export async function isProjectToolHidden(
  projectId: string,
  tool: HideableTool,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("hidden_tools")
    .eq("id", projectId)
    .maybeSingle();

  if (!data) return false;
  return parseHiddenTools(data.hidden_tools).includes(tool);
}
