import type { ProposalStatus } from "@/components/proposals/types";

export type LeadTimelineItem = {
  id: string;
  at: string;
  title: string;
  detail: string | null;
};

export type LeadTimelineDay = {
  label: string;
  items: LeadTimelineItem[];
};

type TimelineMessage = {
  id: string;
  subject: string | null;
  body: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
};

type TimelineProposal = {
  id: string;
  title: string;
  status: ProposalStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
};

function timestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function snippet(value: string | null | undefined): string | null {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  if (!text) return null;
  return text.length > 140 ? `${text.slice(0, 139)}…` : text;
}

function emailTitle(status: string): string {
  if (status === "sent") return "Email sent";
  if (status === "failed") return "Email failed";
  return "Email draft";
}

export function buildLeadTimeline(input: {
  leadId: string;
  createdAt: string;
  source: string | null;
  messages: TimelineMessage[];
  proposals: TimelineProposal[];
}): LeadTimelineItem[] {
  const items: LeadTimelineItem[] = [];

  if (timestamp(input.createdAt) > 0) {
    const source = input.source?.trim();
    items.push({
      id: `created-${input.leadId}`,
      at: input.createdAt,
      title: "Inquiry added",
      detail: source ? `via ${source}` : null,
    });
  }

  for (const message of input.messages) {
    const at = message.sent_at ?? message.created_at;
    if (timestamp(at) === 0) continue;
    items.push({
      id: `email-${message.id}`,
      at,
      title: emailTitle(message.status),
      detail: snippet(message.subject) ?? snippet(message.body),
    });
  }

  for (const proposal of input.proposals) {
    const title = proposal.title.trim() || "Proposal";
    if (timestamp(proposal.created_at) > 0) {
      items.push({
        id: `proposal-created-${proposal.id}`,
        at: proposal.created_at,
        title: "Proposal created",
        detail: title,
      });
    }

    if (proposal.status === "sent" && timestamp(proposal.updated_at) > 0) {
      items.push({
        id: `proposal-sent-${proposal.id}`,
        at: proposal.updated_at,
        title: "Proposal sent",
        detail: title,
      });
    }

    if (proposal.status === "accepted") {
      const at = proposal.accepted_at ?? proposal.updated_at;
      if (timestamp(at) > 0) {
        items.push({
          id: `proposal-accepted-${proposal.id}`,
          at,
          title: "Proposal accepted",
          detail: title,
        });
      }
    }

    if (proposal.status === "declined" && timestamp(proposal.updated_at) > 0) {
      items.push({
        id: `proposal-declined-${proposal.id}`,
        at: proposal.updated_at,
        title: "Proposal declined",
        detail: title,
      });
    }
  }

  items.sort((a, b) => timestamp(b.at) - timestamp(a.at) || a.id.localeCompare(b.id));
  return items;
}

export function groupTimelineByDay(items: LeadTimelineItem[]): LeadTimelineDay[] {
  const groups: LeadTimelineDay[] = [];

  for (const item of items) {
    const label = new Date(item.at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const current = groups[groups.length - 1];
    if (current && current.label === label) {
      current.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return groups;
}

export function formatTimelineTime(value: string): string {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
