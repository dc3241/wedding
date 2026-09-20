import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ContactForm } from "@/app/contact/ContactForm";
import { AuthenticatedAppShell } from "@/components/authenticated-app-shell";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/ui/topbar";
import { ACCOUNT_LOCKED_PATH } from "@/lib/billing/entitlement-gate";
import { shellLayoutClass } from "@/lib/density";
import { getAccountContext } from "@/lib/account-context";
import { getPostLoginPath } from "@/lib/post-login-path";
import { hasSupabaseAuthCookie } from "@/lib/supabase-auth-cookie";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with First Look.",
};

type HomeLink = {
  href: string;
  label: string;
};

function homeLinkForPath(
  href: string,
  kind: "personal" | "business" | null,
): HomeLink {
  if (href === ACCOUNT_LOCKED_PATH) {
    return { href, label: "← Back to your account" };
  }
  if (href === "/onboarding") {
    return { href, label: "← Back to setup" };
  }
  if (href === "/projects") {
    return { href, label: "← Back to projects" };
  }
  if (href.startsWith("/projects/")) {
    return { href, label: "← Back to your wedding" };
  }
  if (
    kind === "business" ||
    href === "/dashboard" ||
    href.startsWith("/dashboard?")
  ) {
    return { href, label: "← Back to dashboard" };
  }
  return { href, label: "← Back" };
}

async function resolveSignedInHome(): Promise<{
  homeLink: HomeLink;
  kind: "personal" | "business";
} | null> {
  const cookieStore = await cookies();
  if (!hasSupabaseAuthCookie(cookieStore.getAll())) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const [account, href] = await Promise.all([
    getAccountContext(supabase),
    getPostLoginPath(supabase),
  ]);
  const kind = account?.kind ?? "personal";
  return { homeLink: homeLinkForPath(href, kind), kind };
}

function ContactCard({ homeLink }: { homeLink: HomeLink }) {
  return (
    <Card className="mx-auto w-full max-w-md p-8">
      <ContactForm homeLink={homeLink} />
    </Card>
  );
}

export default async function ContactPage() {
  const signedIn = await resolveSignedInHome();

  if (signedIn) {
    return (
      <AuthenticatedAppShell>
        <div className={shellLayoutClass(signedIn.kind, false, "reading")}>
          <ContactCard homeLink={signedIn.homeLink} />
        </div>
      </AuthenticatedAppShell>
    );
  }

  const guestHome: HomeLink = { href: "/", label: "← Back to home" };

  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-6 py-[18px] md:px-8">
        <Link href="/" className="inline-block no-underline">
          <Wordmark />
        </Link>
        <Link
          href="/"
          className="text-[13px] font-medium text-muted no-underline hover:text-ink"
        >
          {guestHome.label}
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <ContactCard homeLink={guestHome} />
      </div>
    </div>
  );
}
