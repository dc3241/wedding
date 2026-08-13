import { NextResponse } from "next/server";
import { consumePendingInvites } from "@/lib/invitations/pending-invite";
import { getPostLoginPath } from "@/lib/post-login-path";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { project, account } = await consumePendingInvites(supabase);

      if (project && "projectId" in project) {
        return NextResponse.redirect(
          `${origin}/projects/${project.projectId}`,
        );
      }

      if (project && "error" in project) {
        return NextResponse.redirect(
          `${origin}/invite/${encodeURIComponent(project.token)}?error=${encodeURIComponent(project.error)}`,
        );
      }

      if (account && "error" in account) {
        return NextResponse.redirect(
          `${origin}/invite/account/${encodeURIComponent(account.token)}?error=${encodeURIComponent(account.error)}`,
        );
      }

      // Account success (or no pending invites): membership now exists for routing.
      const destination = next ?? (await getPostLoginPath(supabase));
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not authenticate user")}`
  );
}
