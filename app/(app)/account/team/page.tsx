import { redirect } from "next/navigation";
import {
  RemoveAccountMemberButton,
  RevokeAccountInvitationButton,
  TeamInviteForm,
} from "./TeamActions";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { shellLayoutClass } from "@/lib/density";
import {
  listAccountMembers,
  listPendingInvitations,
} from "@/lib/team/queries";
import { createClient } from "@/utils/supabase/server";

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

export default async function TeamPage() {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account || account.kind !== "business") {
    redirect("/account/billing");
  }

  const accountId = await resolveBusinessAccountId(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [members, pending] = await Promise.all([
    listAccountMembers(supabase, accountId),
    listPendingInvitations(supabase, accountId),
  ]);

  const shellClass = shellLayoutClass(account.kind, false, "reading");
  const canRemove = members.length > 1;

  return (
    <div className={shellClass}>
      <PageHeader
        eyebrow="Account"
        title="Team"
        description="Invite teammates to this planner account. Everyone has the same access — no roles."
      />

      <div className="space-y-5">
        <Card className="p-5">
          <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Invite a teammate
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            They join this business account and see the same projects and tools
            you do.
          </p>
          <div className="mt-4">
            <TeamInviteForm accountId={accountId} />
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
                      {expiresInLabel(row.expiresAt)}
                    </p>
                  </div>
                  <RevokeAccountInvitationButton invitationId={row.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              Members
            </h2>
          </div>
          {members.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-muted">
              No members yet.
            </p>
          ) : (
            <ul className="space-y-2 px-3 py-3">
              {members.map((row) => {
                const isSelf = user?.id === row.userId;
                return (
                  <li
                    key={row.userId}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-3 py-3 shadow-recessed"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-ink">
                        {row.email}
                        {isSelf ? (
                          <span className="ml-2 text-[13px] font-normal text-muted">
                            (you)
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[13px] text-muted">
                        Joined {formatShortDate(row.createdAt)}
                      </p>
                    </div>
                    {canRemove ? (
                      <RemoveAccountMemberButton
                        accountId={accountId}
                        userId={row.userId}
                        label={isSelf ? "Leave" : "Remove"}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
