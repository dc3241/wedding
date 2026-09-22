import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How First Look collects, uses, and protects your information — including Gmail connection for vendor outreach.",
};

const SUPPORT_EMAIL = "hello@usefirstlook.app";
const EFFECTIVE_DATE = "September 21, 2026";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted [&_a]:font-medium [&_a]:text-accent [&_a]:no-underline hover:[&_a]:underline">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main className="mx-auto max-w-[760px] px-6 py-14 md:px-8 md:py-20">
        <header className="mb-10">
          <Eyebrow className="mb-4 block">Legal</Eyebrow>
          <h1 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
            Privacy Policy
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">
            Effective {EFFECTIVE_DATE}. This policy describes how First Look
            (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) handles
            information when you use{" "}
            <Link href="https://usefirstlook.app">usefirstlook.app</Link> and
            related services.
          </p>
        </header>

        <div className="space-y-10">
          <Section title="Who we are">
            <p>
              First Look is wedding-planning software for couples, planners,
              and venues. Questions about this policy:{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
          </Section>

          <Section title="Information we collect">
            <p>Depending on how you use First Look, we may collect:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-medium text-ink">Account data</strong>{" "}
                — name, email address, password or sign-in provider details,
                account type, and billing status.
              </li>
              <li>
                <strong className="font-medium text-ink">Wedding data</strong>{" "}
                — project details you enter, such as dates, guest lists, RSVP
                responses, budgets, vendor contacts, seating plans, notes,
                contracts, and website content.
              </li>
              <li>
                <strong className="font-medium text-ink">
                  Guest and lead data
                </strong>{" "}
                — information submitted through RSVP forms, inquiry forms, or
                other flows you publish (for example names, contact details,
                dietary notes, or song requests).
              </li>
              <li>
                <strong className="font-medium text-ink">Usage data</strong> —
                basic logs and analytics about how the service is accessed,
                such as pages viewed, device/browser type, and approximate
                location derived from IP address.
              </li>
              <li>
                <strong className="font-medium text-ink">Payment data</strong> —
                subscription and checkout details processed by our payment
                provider. We do not store full card numbers.
              </li>
            </ul>
          </Section>

          <Section title="Google sign-in and Gmail connection">
            <p>
              First Look offers two separate Google integrations:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-medium text-ink">Google sign-in</strong>{" "}
                — used only to authenticate your First Look account. We receive
                basic profile information Google makes available for sign-in,
                such as your name and email address.
              </li>
              <li>
                <strong className="font-medium text-ink">
                  Gmail connection
                </strong>{" "}
                — optional, and only when you choose to connect Gmail for
                vendor outreach. We request the{" "}
                <code className="rounded bg-well px-1.5 py-0.5 text-[13px] text-ink">
                  gmail.send
                </code>{" "}
                scope so First Look can send email on your behalf from your
                connected Gmail address. We do not request access to read,
                modify, or delete your inbox, labels, or other mailbox content.
              </li>
            </ul>
            <p>
              When you connect Gmail, we store OAuth tokens and the connected
              email address so outreach you approve can be sent through your
              mailbox. You can disconnect Gmail at any time from your account
              settings, and you can revoke First Look&apos;s access in your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                rel="noopener noreferrer"
                target="_blank"
              >
                Google Account permissions
              </a>
              .
            </p>
          </Section>

          <Section title="How we use information">
            <p>We use the information above to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide, operate, and improve First Look.</li>
              <li>
                Authenticate users, manage accounts, and process subscriptions.
              </li>
              <li>
                Send transactional messages, such as account notices, digests,
                and service email you request.
              </li>
              <li>
                Send vendor outreach email only when you connect Gmail and
                explicitly approve a message to send.
              </li>
              <li>
                Display wedding websites, RSVP forms, inquiry forms, and other
                content you publish.
              </li>
              <li>Support customers, prevent abuse, and comply with law.</li>
            </ul>
            <p>
              We do not sell your personal information. We do not use Gmail
              data for advertising, and human review of Gmail content is limited
              to what is necessary to operate, secure, and support the send
              feature you requested.
            </p>
          </Section>

          <Section title="How we share information">
            <p>
              We share information only as needed to run the service, including
              with service providers such as:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Supabase — authentication and database hosting.</li>
              <li>Stripe — subscription billing and payment processing.</li>
              <li>Resend — transactional email delivery from First Look.</li>
              <li>Google — sign-in and optional Gmail send, when you connect.</li>
              <li>Vercel — application hosting and analytics.</li>
            </ul>
            <p>
              We may also share information when required by law, to protect
              rights and safety, or in connection with a business transfer.
              Wedding websites and forms you publish may be visible to visitors
              you share them with.
            </p>
          </Section>

          <Section title="Retention">
            <p>
              We keep account and wedding data while your account is active or
              as needed to provide the service. If you delete content or close
              your account, we delete or de-identify information within a
              reasonable period, except where retention is required for billing,
              security, legal compliance, or dispute resolution.
            </p>
            <p>
              Gmail OAuth tokens are retained only while Gmail remains connected
              and are removed when you disconnect or revoke access.
            </p>
          </Section>

          <Section title="Security">
            <p>
              We use administrative, technical, and organizational measures
              designed to protect information, including encrypted transport,
              access controls, and storing sensitive credentials server-side
              only. No method of transmission or storage is completely secure.
            </p>
          </Section>

          <Section title="Your choices and rights">
            <p>
              Depending on where you live, you may have rights to access,
              correct, delete, or export personal information, or to object to
              or restrict certain processing. To make a request, contact{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
            </p>
            <p>
              You can update much of your wedding data directly in the app. You
              can disconnect Gmail and revoke Google permissions at any time.
            </p>
          </Section>

          <Section title="Children">
            <p>
              First Look is not directed to children under 13, and we do not
              knowingly collect personal information from children under 13.
            </p>
          </Section>

          <Section title="International users">
            <p>
              First Look is operated from the United States. If you use the
              service from another country, your information may be processed in
              the United States and other locations where our providers operate.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this policy from time to time. When we do, we will
              revise the effective date above and, where appropriate, provide
              additional notice in the product or by email.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or use
              our <Link href="/contact">contact form</Link>.
            </p>
          </Section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
