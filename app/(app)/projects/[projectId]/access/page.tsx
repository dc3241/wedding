import { redirect } from "next/navigation";
import {
  RemoveAccessButton,
  RevokeInvitationButton,
} from "./AccessActions";
import { InviteForm } from "./InviteForm";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function expiresInLabel(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 0) return "expired";
  if (days === 1) return "expires in 1 day";
  return `expires in ${days} days`;
}

export default async function AccessPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (account?.kind !== "business") {
    redirect(`/projects/${projectId}`);
  }

  const stackClass = sectionStackClass("business");

  const [{ data: project }, { data: pendingRows }, { data: acceptedRows }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("name, wedding_date")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("project_invitations")
        .select("id, email, role, expires_at, created_at")
        .eq("project_id", projectId)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_invitations")
        .select("id, email, role, accepted_at, accepted_by")
        .eq("project_id", projectId)
        .not("accepted_at", "is", null)
        .order("accepted_at", { ascending: false }),
    ]);

  const projectName = project?.name ?? "Wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  const pending = pendingRows ?? [];
  const accepted = acceptedRows ?? [];

  return (
    <div className={stackClass}>
      <PageHeader
        eyebrow={eyebrow}
        title="Access"
        description="Invite the couple to this wedding. They see only this project."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              Invite
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Send a link to the couple&apos;s email. Role is couple.
            </p>
            <div className="mt-4">
              <InviteForm projectId={projectId} />
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-hairline px-5 py-4">
              <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                Pending invitations
              </h2>
            </div>
            {pending.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-muted">
                No pending invitations.
              </p>
            ) : (
              <ul className="space-y-2 px-3 py-3">
                {pending.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-3 py-3 shadow-recessed"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-ink">
                        {row.email}
                      </p>
                      <p className="text-[13px] text-muted">
                        {expiresInLabel(row.expires_at)}
                      </p>
                    </div>
                    <RevokeInvitationButton invitationId={row.id} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-hairline px-5 py-4">
              <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                Has access
              </h2>
            </div>
            {accepted.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-muted">
                No one has accepted an invitation yet.
              </p>
            ) : (
              <ul className="space-y-2 px-3 py-3">
                {accepted.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-3 py-3 shadow-recessed"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-ink">
                        {row.email}
                      </p>
                      <p className="text-[13px] text-muted">
                        Accepted{" "}
                        {row.accepted_at
                          ? formatShortDate(row.accepted_at)
                          : "—"}
                      </p>
                    </div>
                    {row.accepted_by ? (
                      <RemoveAccessButton
                        projectId={projectId}
                        userId={row.accepted_by}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              How access works
            </h2>
            <ul className="mt-3 space-y-2 text-[13px] text-muted">
              <li>
                An invited couple sees only this wedding — not your full book.
              </li>
              <li>
                They can edit the wedding date and budget target. They cannot see
                Contracts.
              </li>
              <li>
                They do not get their own account. Removing access takes the
                project away on their next load.
              </li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
