import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { updatePassword } from "./actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/ui/topbar";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new password for your First Look account.",
};

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 6;

type SearchParams = {
  code?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
};

const FORM_ERRORS: Record<string, string> = {
  mismatch: "Passwords don't match.",
  weak: `Choose a password that's at least ${MIN_PASSWORD_LENGTH} characters.`,
  update: "We couldn't update your password. Try again.",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isBrokenResetLink(
  error?: string,
  errorCode?: string,
  errorDescription?: string,
): boolean {
  if (errorCode) return true;
  if (
    error === "invalid" ||
    error === "access_denied" ||
    error === "unauthorized_client" ||
    error === "otp_expired"
  ) {
    return true;
  }
  if (error && errorDescription) return true;
  return false;
}

function AuthShell({ children }: { children: React.ReactNode }) {
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

function InvalidLink() {
  return (
    <AuthShell>
      <div className="text-center">
        <Eyebrow className="mb-3 block">Password reset</Eyebrow>
        <h1 className="font-display text-[32px] leading-none tracking-[-0.03em] text-ink md:text-[36px]">
          Link not valid
        </h1>
        <p className="mt-4 text-[15px] font-medium text-muted">
          This link isn&apos;t valid. Request a new one.
        </p>
        <div className="mt-8">
          <ButtonLink href="/forgot-password" variant="primary" className="w-full">
            Request a new link
          </ButtonLink>
        </div>
      </div>
    </AuthShell>
  );
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const code = first(params.code);
  const error = first(params.error);
  const errorCode = first(params.error_code);
  const errorDescription = first(params.error_description);

  if (code) {
    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=/auth/reset-password`,
    );
  }

  if (isBrokenResetLink(error, errorCode, errorDescription)) {
    return <InvalidLink />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <InvalidLink />;
  }

  const formError = error ? FORM_ERRORS[error] : undefined;

  return (
    <AuthShell>
      <div className="mb-6 text-center">
        <Eyebrow className="mb-3 block">Password reset</Eyebrow>
        <h1 className="font-display text-[36px] leading-none tracking-[-0.01em] text-ink">
          Set a new password
        </h1>
        <p className="mt-3 text-sm text-muted">
          Choose a new password for your account.
        </p>
      </div>

      <form className="space-y-4" action={updatePassword}>
        {formError ? (
          <p className="rounded-[var(--radius-inner)] border border-rosewood/30 bg-accent-wash px-3 py-2 text-sm text-rosewood">
            {formError}
          </p>
        ) : null}

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-ink">
            New password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm" className="text-sm font-medium text-ink">
            Confirm password
          </label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
          />
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" className="w-full text-[15px]">
            Update password
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
