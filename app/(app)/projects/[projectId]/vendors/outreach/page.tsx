import Link from "next/link";
import {
  OutreachDraftEditor,
  type OutreachDraft,
} from "@/components/vendors/OutreachDraftEditor";
import { GmailConnection } from "@/components/vendors/GmailConnection";
import { SendAllDraftsButton } from "@/components/vendors/SendAllDraftsButton";
import { getGmailConnectionEmail } from "@/lib/gmail-connection-status";
import { createClient } from "@/utils/supabase/server";

type SentMessage = {
  id: string;
  subject: string | null;
  sent_at: string | null;
  vendorName: string;
};

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
    `
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
    `
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
    <div className="space-y-6">
      <Link
        href={`/projects/${projectId}/vendors`}
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        ← Back to vendors
      </Link>

      <header className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Outreach drafts</h2>
        <p className="text-sm text-zinc-500">
          Review, edit, and send emails from your connected Gmail. Replies go to
          your inbox.
        </p>
      </header>

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
        <p className="text-sm text-zinc-500">
          No drafts ready to send. Select vendors on your outreach list and
          click Draft outreach.
        </p>
      ) : (
        <div className="space-y-8">
          {vendorNames.map((name) => (
            <section key={name} className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-900">{name}</h3>
              <div className="space-y-3">
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
        <section className="space-y-3 border-t border-zinc-100 pt-6">
          <h3 className="text-sm font-medium text-zinc-900">Sent</h3>
          <ul className="space-y-2">
            {sent.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-zinc-200 px-4 py-3 text-sm"
              >
                <p className="font-medium text-zinc-900">{item.vendorName}</p>
                <p className="text-zinc-600">{item.subject ?? "(no subject)"}</p>
                {item.sent_at ? (
                  <p className="mt-1 text-xs text-zinc-400">
                    Sent{" "}
                    {new Date(item.sent_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
