"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCoupleDestinationPath } from "@/lib/onboarding-gate";
import { getPostLoginPath } from "@/lib/post-login-path";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CreateProjectResult =
  | { ok: true; projectId: string }
  | { ok: false; error: string };

export async function bootstrapAccountAndProject(
  formData: FormData,
  venueIntent = false,
) {
  const accountName = formData.get("accountName") as string;
  const accountKind = venueIntent
    ? "business"
    : (formData.get("accountKind") as string);
  const isBusiness = accountKind === "business";
  const projectName = isBusiness
    ? null
    : ((formData.get("projectName") as string) ?? null);

  const supabase = await createClient();

  const { data: projectId, error } = await supabase.rpc(
    "bootstrap_account_and_project",
    {
      p_account_name: accountName,
      p_account_kind: accountKind,
      p_project_name: projectName,
    }
  );

  if (error) {
    if (error.message.includes("already_bootstrapped")) {
      redirect(await getPostLoginPath(supabase));
    }
    redirect(
      `/projects?error=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");

  if (isBusiness) {
    if (venueIntent) {
      redirect("/account/venue-upgrade");
    }
    redirect("/dashboard");
  }

  redirect(await getCoupleDestinationPath(supabase, projectId as string));
}

/** VENUE-04: same bootstrap as planner; one-time redirect hint only. */
export async function bootstrapAccountWithVenueIntent(formData: FormData) {
  return bootstrapAccountAndProject(formData, true);
}

/**
 * Resolve the account to attach a new project to.
 * Prefer business (planner) when present; otherwise personal (couple).
 * Filters by auth user explicitly — do not rely on nested `accounts.kind` embeds alone.
 */
async function resolveProjectAccountId(
  supabase: SupabaseClient,
): Promise<{ accountId: string } | { error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in." };
  }

  const { data: memberships, error: membershipError } = await supabase
    .from("account_members")
    .select("account_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (!memberships?.length) {
    return { error: "No account found." };
  }

  const accountIds = memberships.map((row) => row.account_id);
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, kind")
    .in("id", accountIds);

  if (accountsError) {
    return { error: accountsError.message };
  }

  const business = accounts?.find((account) => account.kind === "business");
  if (business) {
    return { accountId: business.id };
  }

  const personal = accounts?.find((account) => account.kind === "personal");
  if (personal) {
    return { accountId: personal.id };
  }

  return { accountId: memberships[0].account_id };
}

export async function createProject(
  name: string,
): Promise<CreateProjectResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Wedding name is required." };
  }

  const supabase = await createClient();
  const resolved = await resolveProjectAccountId(supabase);

  if ("error" in resolved) {
    return { ok: false, error: resolved.error };
  }

  // No `.select()` after insert: projects SELECT RLS (`can_access_project`)
  // re-queries by id and can reject INSERT…RETURNING for the in-flight row.
  const projectId = randomUUID();
  const { error } = await supabase.from("projects").insert({
    id: projectId,
    account_id: resolved.accountId,
    name: trimmed,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { ok: true, projectId };
}

/** Form-action wrapper for the couple empty-account page (redirects). */
export async function createProjectFromForm(formData: FormData) {
  const result = await createProject((formData.get("name") as string) ?? "");

  if (!result.ok) {
    redirect(`/projects?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/projects/${result.projectId}`);
}

export type CloneProjectTemplateResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * TMPL-01: seed a brand-new project's checklist / budget / vendor-target
 * structure from another project in the same account. Thin RPC wrapper.
 */
export async function cloneProjectTemplate(
  sourceProjectId: string,
  targetProjectId: string,
): Promise<CloneProjectTemplateResult> {
  const source = sourceProjectId.trim();
  const target = targetProjectId.trim();
  if (!source || !target) {
    return { ok: false, error: "Source and target projects are required." };
  }
  if (source === target) {
    return { ok: false, error: "Source and target must be different projects." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("clone_project_template", {
    p_source_project_id: source,
    p_target_project_id: target,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/projects/${target}`);
  revalidatePath(`/projects/${target}/checklist`);
  revalidatePath(`/projects/${target}/budget`);
  revalidatePath(`/projects/${target}/vendors`);
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  return { ok: true };
}
