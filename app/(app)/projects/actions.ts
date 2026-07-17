"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCoupleDestinationPath } from "@/lib/onboarding-gate";
import { getPostLoginPath } from "@/lib/post-login-path";
import { createClient } from "@/utils/supabase/server";

export async function bootstrapAccountAndProject(formData: FormData) {
  const accountKind = formData.get("accountKind") as string;
  const accountName = formData.get("accountName") as string;
  const projectName = formData.get("projectName") as string;

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

  if (accountKind === "business") {
    redirect("/dashboard");
  }

  redirect(await getCoupleDestinationPath(supabase, projectId as string));
}

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;

  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("account_members")
    .select("account_id")
    .limit(1)
    .single();

  if (membershipError) {
    redirect(
      `/projects?error=${encodeURIComponent(membershipError.message)}`
    );
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ account_id: membership.account_id, name })
    .select("id")
    .single();

  if (error) {
    redirect(`/projects?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}`);
}
