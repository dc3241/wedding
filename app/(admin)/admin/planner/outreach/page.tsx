import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";

const STATS = [
  { label: "Targets loaded", value: "596", sub: "Arizona pilot" },
  { label: "Emails sent", value: "—", sub: "wires to Resend" },
  { label: "Follow-ups due", value: "—", sub: "wires to Resend" },
  { label: "Replies", value: "—", sub: "Reply-To → Dom's Gmail" },
];

const VARIANTS = [
  { id: "V1", angle: "Pain-point", share: "~149 targets" },
  { id: "V2", angle: "Peer-credibility", share: "~149 targets" },
  { id: "V3", angle: "Ultra-short", share: "~149 targets" },
  { id: "V4", angle: "Curiosity", share: "~149 targets" },
];

export default function PlannerOutreachPage() {
  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Venue outreach"
        description="Arizona pilot — cold email via Resend, four variants assigned by row number"
      />

      <div className="mb-4 grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label} className="px-5 py-4">
            <div className="mb-1.5 text-[14px] font-medium text-muted">
              {stat.label}
            </div>
            <div className="font-display text-[32px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-ink">
              {stat.value}
            </div>
            <div className="mt-1 text-[13px] text-muted">{stat.sub}</div>
          </Card>
        ))}
      </div>

      <Card className="px-6 py-5">
        <Eyebrow className="mb-3 text-accent">
          Variant split (by row number mod 4)
        </Eyebrow>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px] font-medium text-ink">
            <thead>
              <tr className="border-b border-hairline text-[13px] text-muted">
                <th className="py-2 pr-4 font-semibold">Variant</th>
                <th className="py-2 pr-4 font-semibold">Angle</th>
                <th className="py-2 font-semibold">Share</th>
              </tr>
            </thead>
            <tbody>
              {VARIANTS.map((row) => (
                <tr key={row.id} className="border-b border-hairline last:border-b-0">
                  <td className="py-2.5 pr-4 tabular-nums">{row.id}</td>
                  <td className="py-2.5 pr-4">{row.angle}</td>
                  <td className="py-2.5 tabular-nums text-muted">{row.share}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 rounded-[var(--radius-inner)] bg-well px-3.5 py-3 text-[13px] text-muted shadow-recessed">
          Sent from Jordyn &lt;jordyn@inquiries.usefirstlook.app&gt;, Reply-To
          routed to Dom&apos;s personal Gmail. Dedupe relies on Resend&apos;s
          sent-history, not sheet writes. Stat cards above are placeholders —
          the real build reads these live from Resend.
        </p>
        <p className="mt-3 text-[13px] text-muted">
          Confirm the DMARC record for{" "}
          <span className="font-medium text-ink">
            _dmarc.inquiries.usefirstlook.app
          </span>{" "}
          is set up before outreach volume scales past the pilot.
        </p>
      </Card>
    </div>
  );
}
