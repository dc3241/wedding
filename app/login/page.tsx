import { LoginCard, type LoginMode } from "./login-card";
import { Wordmark } from "@/components/ui/topbar";
import type { Metadata } from "next";
import Link from "next/link";

type LoginSearchParams = {
  error?: string;
  message?: string;
  mode?: string;
};

function resolveMode(mode: string | undefined): LoginMode {
  return mode === "signup" ? "signup" : "login";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}): Promise<Metadata> {
  const { mode } = await searchParams;
  const isSignup = resolveMode(mode) === "signup";
  return {
    title: isSignup ? "Sign up" : "Log in",
    description: isSignup
      ? "Create your First Look wedding planning account."
      : "Sign in to your First Look wedding planning account.",
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<LoginSearchParams>;
}) {
  const { error, message, mode } = await searchParams;

  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="border-b border-hairline px-6 py-[18px] md:px-8">
        <Link href="/" className="inline-block no-underline">
          <Wordmark />
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <LoginCard
          initialMode={resolveMode(mode)}
          error={error}
          message={message}
        />
      </div>
    </div>
  );
}
