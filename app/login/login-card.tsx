"use client";

import { login, signup } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type LoginMode = "login" | "signup";

export function LoginCard({
  initialMode,
  error: initialError,
  message,
}: {
  initialMode: LoginMode;
  error?: string;
  message?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [error, setError] = useState(initialError ?? null);
  const isSignup = mode === "signup";

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setError(initialError ?? null);
  }, [initialError]);

  function toggleMode() {
    const next: LoginMode = isSignup ? "login" : "signup";
    setMode(next);
    setError(null);
    router.replace(next === "signup" ? "/login?mode=signup" : "/login", {
      scroll: false,
    });
  }

  return (
    <Card className="w-full max-w-md p-8">
      <div className="mb-6 text-center">
        <Eyebrow className="mb-3 block">
          {isSignup ? "Get started" : "Welcome back"}
        </Eyebrow>
        <h1 className="font-display text-[36px] leading-none tracking-[-0.01em] text-ink">
          {isSignup ? "Sign up" : "Log in"}
        </h1>
        <p className="mt-3 text-sm text-muted">
          {isSignup
            ? "Create your First Look wedding planning account"
            : "Sign in to your wedding planning account"}
        </p>
      </div>

      {error ? (
        <p className="mb-4 rounded-[var(--radius-inner)] border border-rosewood/30 bg-accent-wash px-3 py-2 text-sm text-rosewood">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mb-4 rounded-[var(--radius-inner)] border border-sage/30 bg-accent-wash px-3 py-2 text-sm text-sage">
          {message}
        </p>
      ) : null}

      <form className="space-y-4">
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

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-ink">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            formAction={isSignup ? signup : login}
            variant="primary"
            className="w-full text-[15px]"
          >
            {isSignup ? "Sign up" : "Log in"}
          </Button>
        </div>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={toggleMode}
              className="text-accent hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Log in
            </button>
          </>
        ) : (
          <>
            New here?{" "}
            <button
              type="button"
              onClick={toggleMode}
              className="text-accent hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Sign up
            </button>
          </>
        )}
      </p>
    </Card>
  );
}
