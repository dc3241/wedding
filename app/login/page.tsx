import { login, signup } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/ui/topbar";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to your Aisle wedding planning account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="border-b border-stone px-6 py-[18px] md:px-8">
        <Link href="/" className="inline-block no-underline">
          <Wordmark />
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-8">
          <div className="mb-6 text-center">
            <Eyebrow className="mb-3 block">Welcome back</Eyebrow>
            <h1 className="font-display text-[36px] leading-none tracking-[-0.01em] text-ink">
              Log in
            </h1>
            <p className="mt-3 text-sm text-ink-muted">
              Sign in to your wedding planning account
            </p>
          </div>

          {error ? (
            <p className="mb-4 rounded-[var(--radius)] border border-rosewood/30 bg-plum-tint px-3 py-2 text-sm text-rosewood">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="mb-4 rounded-[var(--radius)] border border-sage/30 bg-plum-tint px-3 py-2 text-sm text-sage">
              {message}
            </p>
          ) : null}

          <form className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-ink-soft">
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

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-ink-soft"
              >
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                formAction={login}
                variant="primary"
                className="flex-1 text-[15px]"
              >
                Log in
              </Button>
              <Button
                formAction={signup}
                variant="default"
                className="flex-1 text-[15px]"
              >
                Sign up
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-[13px] text-ink-muted">
            New here?{" "}
            <Link href="/" className="text-plum no-underline hover:text-plum-deep">
              Learn about Aisle
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
