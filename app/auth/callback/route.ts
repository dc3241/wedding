import { NextResponse } from "next/server";
import { consumePendingInvite } from "@/lib/invitations/pending-invite";
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
      const pending = await consumePendingInvite(supabase);

      if (pending && "projectId" in pending) {
        return NextResponse.redirect(
          `${origin}/projects/${pending.projectId}`,
        );
      }

      if (pending && "error" in pending) {
        return NextResponse.redirect(
          `${origin}/invite/${encodeURIComponent(pending.token)}?error=${encodeURIComponent(pending.error)}`,
        );
      }

      const destination = next ?? (await getPostLoginPath(supabase));
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not authenticate user")}`
  );
}
