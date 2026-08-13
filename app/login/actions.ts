"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { consumePendingInvites } from "@/lib/invitations/pending-invite";
import { getPostLoginPath } from "@/lib/post-login-path";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");

  const { project, account } = await consumePendingInvites(supabase);

  if (project && "projectId" in project) {
    redirect(`/projects/${project.projectId}`);
  }

  if (project && "error" in project) {
    redirect(
      `/invite/${encodeURIComponent(project.token)}?error=${encodeURIComponent(project.error)}`,
    );
  }

  if (account && "error" in account) {
    redirect(
      `/invite/account/${encodeURIComponent(account.token)}?error=${encodeURIComponent(account.error)}`,
    );
  }

  redirect(await getPostLoginPath(supabase));
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Check your email to confirm your account.");
}

export async function logout() {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}
