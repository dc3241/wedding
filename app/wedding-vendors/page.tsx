import Link from "next/link";
import type { Metadata } from "next";
import { DirectoryShell } from "@/components/directory/directory-shell";
import { JsonLd } from "@/components/marketing/json-ld";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getStateCounts } from "@/lib/directory/data";
import { DIRECTORY_STATES } from "@/lib/directory/states";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Wedding Venues by State",
  description:
    "Browse wedding venues in every state. Free to use, ordered by city and name — venues can't pay to rank higher. Reach out from your own planning workspace.",
  path: "/wedding-vendors",
});

export default async function WeddingVendorsHubPage() {
  const counts = await getStateCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <DirectoryShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Wedding venues", path: "/wedding-vendors" },
        ])}
      />
      <section className="bg-deep px-6 py-16 text-center md:px-10 md:py-20">
        <div className="mx-auto max-w-3xl">
          <Eyebrow className="text-deep-eyebrow">Wedding venue directory</Eyebrow>
          <h1 className="mt-4 text-[34px] font-extrabold leading-tight text-white md:text-[48px]">
            Find your wedding venue, state by state
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-white/80">
            Dedicated wedding venues, listed alphabetically by city. No paid placement, no
            sign-up to browse. When you find one you like, reach out from your free First
            Look workspace.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12 md:px-10">
        <h2 className="text-[20px] font-bold">
          Browse by state{total > 0 ? <span className="ml-2 text-muted">{total} venues</span> : null}
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {DIRECTORY_STATES.map((s) => {
            const n = counts[s.code] ?? 0;
            return (
              <li key={s.code}>
                <Link href={`/wedding-vendors/${s.slug}`} className="block no-underline">
                  <Card className="p-4 transition-shadow hover:shadow-card-emotional">
                    <span className="block text-[15px] font-bold text-ink">{s.name}</span>
                    <span className="text-[13px] text-muted">
                      {n > 0 ? `${n} venues` : "Coming soon"}
                    </span>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </DirectoryShell>
  );
}
