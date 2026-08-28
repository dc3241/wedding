"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { consumePendingInvites } from "@/lib/invitations/pending-invite";
import { getPostLoginPath } from "@/lib/post-login-path";
import { createClient } from "@/utils/supabase/server";

const MIN_PASSWORD_LENGTH = 6;

export async function updatePassword(formData: FormData) {
  const passwordRaw = formData.get("password");
  const confirmRaw = formData.get("confirm");
  const password = typeof passwordRaw === "string" ? passwordRaw : "";
  const confirm = typeof confirmRaw === "string" ? confirmRaw : "";

  if (password !== confirm) {
    redirect("/auth/reset-password?error=mismatch");
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    redirect("/auth/reset-password?error=weak");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/reset-password?error=invalid");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("password-reset: update failed", error.message);
    const lowered = error.message.toLowerCase();
    if (lowered.includes("least") || lowered.includes("weak") || lowered.includes("characters")) {
      redirect("/auth/reset-password?error=weak");
    }
    redirect("/auth/reset-password?error=update");
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
