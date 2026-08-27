import Link from "next/link";
import type { Metadata } from "next";
import { ContactForm } from "@/app/contact/ContactForm";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/ui/topbar";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with First Look.",
};

export default function ContactPage() {
  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="border-b border-hairline px-6 py-[18px] md:px-8">
        <Link href="/" className="inline-block no-underline">
          <Wordmark />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md p-8">
          <ContactForm />
        </Card>
      </div>
    </div>
  );
}
