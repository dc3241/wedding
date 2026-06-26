import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountContext } from "@/lib/account-context";

/** True when the couple has not finished the preferences wizard. */
export async function needsCoupleOnboarding(
  supabase: SupabaseClient,
  projectId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("wedding_profile")
    .select("onboarded_at")
    .eq("project_id", projectId)
    .maybeSingle();

  return !data?.onboarded_at;
}

/** Dashboard or wizard path for a couple's single project. */
export async function getCoupleDestinationPath(
  supabase: SupabaseClient,
  projectId: string,
): Promise<string> {
  const needs = await needsCoupleOnboarding(supabase, projectId);
  return needs ? "/onboarding" : `/projects/${projectId}`;
}

/** Returns `/onboarding` when a couple project still needs the wizard. */
export async function coupleOnboardingRedirect(
  supabase: SupabaseClient,
  account: AccountContext | null,
  projectId: string,
): Promise<string | null> {
  if (!account || account.kind !== "personal") {
    return null;
  }

  const needs = await needsCoupleOnboarding(supabase, projectId);
  return needs ? "/onboarding" : null;
}
