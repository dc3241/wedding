import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Wordmark } from "@/components/ui/topbar";
import { acceptProjectInvitation } from "@/lib/invitations/actions";
import { setPendingInvite } from "@/lib/invitations/pending-invite";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invitation",
  description: "You've been invited to plan a wedding on First Look.",
};

const ERROR_COPY: Record<string, string> = {
  email_mismatch:
    "This invitation was sent to a different email address.",
  expired: "This invitation has expired. Ask your planner for a new link.",
  revoked: "This invitation is no longer active.",
  invalid: "We couldn't find this invitation. Check the link.",
  already: "This invitation has already been accepted by someone else.",
};

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="border-b border-hairline px-6 py-[18px] md:px-8">
        <Link href="/" className="inline-block no-underline">
          <Wordmark />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-8">{children}</Card>
      </div>
    </div>
  );
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error: errorParam } = await searchParams;

  if (errorParam) {
    const message =
      ERROR_COPY[errorParam] ??
      "Something went wrong with this invitation.";

    return (
      <InviteShell>
        <div className="text-center">
          <Eyebrow className="mb-3 block">Invitation</Eyebrow>
          <h1 className="font-display text-[32px] leading-none tracking-[-0.03em] text-ink md:text-[36px]">
            Couldn&apos;t join
          </h1>
          <p className="mt-4 text-[15px] font-medium text-muted">{message}</p>
          {errorParam === "email_mismatch" ? (
            <form action={logout} className="mt-8">
              <Button type="submit" variant="primary" className="w-full">
                Sign out and try again
              </Button>
            </form>
          ) : (
            <div className="mt-8">
              <ButtonLink href="/login" variant="primary" className="w-full">
                Go to log in
              </ButtonLink>
            </div>
          )}
        </div>
      </InviteShell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const result = await acceptProjectInvitation(token);

    if (result.ok) {
      redirect(`/projects/${result.projectId}`);
    }

    redirect(
      `/invite/${encodeURIComponent(token)}?error=${encodeURIComponent(result.error)}`,
    );
  }

  await setPendingInvite(token);

  return (
    <InviteShell>
      <div className="text-center">
        <Eyebrow className="mb-3 block">Invitation</Eyebrow>
        <h1 className="font-display text-[32px] leading-none tracking-[-0.03em] text-ink md:text-[36px]">
          You&apos;re invited
        </h1>
        <p className="mt-4 text-[15px] font-medium text-muted">
          You&apos;ve been invited to plan a wedding on First Look.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/login" variant="primary" className="flex-1">
            Sign up
          </ButtonLink>
          <ButtonLink href="/login" variant="default" className="flex-1">
            Log in
          </ButtonLink>
        </div>
      </div>
    </InviteShell>
  );
}
