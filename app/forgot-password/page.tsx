import Link from "next/link";
import type { Metadata } from "next";
import { requestPasswordReset } from "./actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/ui/topbar";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset the password for your First Look account.",
};

type SearchParams = {
  sent?: string;
  error?: string;
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { sent, error } = await searchParams;
  const showSent = Boolean(sent);
  const showEmailError = error === "email";

  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="border-b border-hairline px-6 py-[18px] md:px-8">
        <Link href="/" className="inline-block no-underline">
          <Wordmark />
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-8">
          <div className="mb-6 text-center">
            <Eyebrow className="mb-3 block">Password reset</Eyebrow>
            <h1 className="font-display text-[36px] leading-none tracking-[-0.01em] text-ink">
              {showSent ? "Check your email" : "Forgot password"}
            </h1>
            <p className="mt-3 text-sm text-muted">
              {showSent
                ? "If that email has an account, we sent a reset link."
                : "Enter your email and we'll send a reset link if there's an account."}
            </p>
          </div>

          {showSent ? (
            <ButtonLink href="/login" variant="primary" className="w-full">
              Back to log in
            </ButtonLink>
          ) : (
            <form className="space-y-4" action={requestPasswordReset}>
              {showEmailError ? (
                <p className="rounded-[var(--radius-inner)] border border-rosewood/30 bg-accent-wash px-3 py-2 text-sm text-rosewood">
                  Enter a valid email address.
                </p>
              ) : null}

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-ink">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-[15px]"
                >
                  Send reset link
                </Button>
              </div>
            </form>
          )}

          {showSent ? null : (
            <p className="mt-6 text-center text-[13px] text-muted">
              Remembered it?{" "}
              <Link
                href="/login"
                className="text-accent hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Log in
              </Link>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
