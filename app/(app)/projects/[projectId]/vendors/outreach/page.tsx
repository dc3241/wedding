import Link from "next/link";
import {
  OutreachDraftEditor,
  type OutreachDraft,
} from "@/components/vendors/OutreachDraftEditor";
import { GmailConnection } from "@/components/vendors/GmailConnection";
import { SendAllDraftsButton } from "@/components/vendors/SendAllDraftsButton";
import { VendorListRow } from "@/components/vendors/VendorListRow";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { getGmailConnectionEmail } from "@/lib/gmail-connection-status";
import { createClient } from "@/utils/supabase/server";

type SentMessage = {
  id: string;
  subject: string | null;
  sent_at: string | null;
  vendorName: string;
};

function formatSentAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function OutreachDraftsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ gmail_error?: string; gmail_connected?: string }>;
}) {
  const { projectId } = await params;
  const { gmail_error: gmailError, gmail_connected: gmailConnected } =
    await searchParams;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");
  const connectedEmail = await getGmailConnectionEmail();
  const returnTo = `/projects/${projectId}/vendors/outreach`;
  const connectHref = `/auth/google?returnTo=${encodeURIComponent(returnTo)}`;

  const { data: rows } = await supabase
    .from("outreach_messages")
    .select(
      `
      id,
      subject,
      body,
      status,
      send_error,
      updated_at,
      project_vendors!inner (
        project_id,
        vendors ( name, category )
      )
    `,
    )
    .eq("project_vendors.project_id", projectId)
    .eq("direction", "outbound")
    .eq("channel", "email")
    .in("status", ["draft", "failed"])
    .order("updated_at", { ascending: false });

  const drafts: OutreachDraft[] = (rows ?? [])
    .map((row) => {
      const pv = Array.isArray(row.project_vendors)
        ? row.project_vendors[0]
        : row.project_vendors;
      const vendor = pv
        ? Array.isArray(pv.vendors)
          ? pv.vendors[0]
          : pv.vendors
        : null;

      if (!vendor) return null;

      return {
        id: row.id,
        subject: row.subject,
        body: row.body,
        updated_at: row.updated_at,
        status: row.status as OutreachDraft["status"],
        sendError: row.send_error,
        vendorName: vendor.name,
        vendorCategory: vendor.category,
      };
    })
    .filter((draft): draft is OutreachDraft => draft !== null);

  const { data: sentRows } = await supabase
    .from("outreach_messages")
    .select(
      `
      id,
      subject,
      sent_at,
      project_vendors!inner (
        project_id,
        vendors ( name )
      )
    `,
    )
    .eq("project_vendors.project_id", projectId)
    .eq("direction", "outbound")
    .eq("channel", "email")
    .eq("status", "sent")
    .order("sent_at", { ascending: false });

  const sent: SentMessage[] = (sentRows ?? [])
    .map((row) => {
      const pv = Array.isArray(row.project_vendors)
        ? row.project_vendors[0]
        : row.project_vendors;
      const vendor = pv
        ? Array.isArray(pv.vendors)
          ? pv.vendors[0]
          : pv.vendors
        : null;

      if (!vendor) return null;

      return {
        id: row.id,
        subject: row.subject,
        sent_at: row.sent_at,
        vendorName: vendor.name,
      };
    })
    .filter((item): item is SentMessage => item !== null);

  const grouped = drafts.reduce<Record<string, OutreachDraft[]>>((acc, draft) => {
    const key = draft.vendorName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(draft);
    return acc;
  }, {});

  const vendorNames = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className={stackClass}>
      <Link
        href={`/projects/${projectId}/vendors`}
        className="text-[13px] text-ink-muted hover:text-ink"
      >
        ← Back to vendors
      </Link>

      <PageHeader
        className="mt-2"
        eyebrow="Outreach"
        title="Drafts"
        description="Review, edit, and send emails from your connected Gmail. Replies go to your inbox."
      />

      <GmailConnection
        connectedEmail={connectedEmail}
        returnTo={returnTo}
        errorMessage={gmailError ?? null}
        justConnected={gmailConnected === "1"}
      />

      {drafts.length > 0 ? (
        <SendAllDraftsButton
          projectId={projectId}
          draftCount={drafts.length}
          gmailConnected={Boolean(connectedEmail)}
          connectHref={connectHref}
        />
      ) : null}

      {vendorNames.length === 0 ? (
        <p className="text-[13px] text-ink-muted">
          No drafts ready to send. Select vendors on your outreach list and
          click Draft outreach.
        </p>
      ) : (
        <div className="space-y-8">
          {vendorNames.map((name) => (
            <section key={name}>
              <Eyebrow className="mb-4 block">{name}</Eyebrow>
              <div className="space-y-4">
                {grouped[name].map((draft) => (
                  <OutreachDraftEditor
                    key={draft.id}
                    draft={draft}
                    gmailConnected={Boolean(connectedEmail)}
                    connectHref={connectHref}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {sent.length > 0 ? (
        <section className="mt-12 border-t border-stone pt-8">
          <Eyebrow className="mb-4 block">Sent</Eyebrow>
          <div className="divide-y divide-stone">
            {sent.map((item) => (
              <VendorListRow
                key={item.id}
                name={item.vendorName}
                meta={item.subject ?? "(no subject)"}
                trailing={
                  item.sent_at ? (
                    <Pill variant="sage">
                      Sent{" "}
                      <span className="tabnum">{formatSentAt(item.sent_at)}</span>
                    </Pill>
                  ) : (
                    <Pill variant="sage">Sent</Pill>
                  )
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
