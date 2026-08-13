import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Wordmark } from "@/components/ui/topbar";
import { getPostLoginPath } from "@/lib/post-login-path";
import { acceptAccountInvitation } from "@/lib/team/actions";
import { TEAM_BUSINESS_ONLY_MESSAGE } from "@/lib/team/types";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team invitation",
  description: "You've been invited to join a planner team on First Look.",
};

const ERROR_COPY: Record<string, string> = {
  email_mismatch:
    "This invitation was sent to a different email address.",
  expired: "This invitation has expired. Ask your teammate for a new link.",
  revoked: "This invitation is no longer active.",
  invalid: "We couldn't find this invitation. Check the link.",
  already: "This invitation has already been accepted by someone else.",
  not_business: TEAM_BUSINESS_ONLY_MESSAGE,
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
        {/* Tier 2: exactly one --deep field on this surface */}
        <div className="w-full max-w-md rounded-[28px] bg-[var(--deep)] p-6 shadow-[0_18px_44px_-14px_rgba(61,36,48,0.45)] md:p-8">
          <Card variant="emotional" className="p-8">
            {children}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default async function AccountInvitePage({
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
          <Eyebrow className="mb-3 block">Team invitation</Eyebrow>
          <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink md:text-[36px]">
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
    const result = await acceptAccountInvitation(token);

    if (result.ok) {
      redirect(await getPostLoginPath(supabase));
    }

    redirect(
      `/invite/account/${encodeURIComponent(token)}?error=${encodeURIComponent(result.error)}`,
    );
  }

  return (
    <InviteShell>
      <div className="text-center">
        <Eyebrow className="mb-3 block">Team invitation</Eyebrow>
        <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink md:text-[36px]">
          You&apos;re invited
        </h1>
        <p className="mt-4 text-[15px] font-medium text-muted">
          You&apos;ve been invited to join a planner team on First Look.
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
