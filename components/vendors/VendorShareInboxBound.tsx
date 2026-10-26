"use client";

import { sendVendorTokenMessage } from "@/app/vendor/[token]/message-actions";
import { VendorShareInbox } from "@/components/vendors/VendorShareInbox";
import { sendOwnerVendorShareMessage } from "@/lib/vendors/share-message-actions";
import type { VendorShareMessage } from "@/lib/vendors/share-messages";

export function OwnerVendorShareInbox({
  projectVendorId,
  messages,
  ownerLabel,
  vendorLabel,
  className,
}: {
  projectVendorId: string;
  messages: VendorShareMessage[];
  ownerLabel: string;
  vendorLabel: string;
  className?: string;
}) {
  return (
    <VendorShareInbox
      messages={messages}
      viewer="owner"
      ownerLabel={ownerLabel}
      vendorLabel={vendorLabel}
      markReadId={projectVendorId}
      className={className}
      onSend={(body) => sendOwnerVendorShareMessage(projectVendorId, body)}
    />
  );
}

export function TokenVendorShareInbox({
  token,
  messages,
  ownerLabel,
  vendorLabel,
  className,
}: {
  token: string;
  messages: VendorShareMessage[];
  ownerLabel: string;
  vendorLabel: string;
  className?: string;
}) {
  return (
    <VendorShareInbox
      messages={messages}
      viewer="vendor"
      ownerLabel={ownerLabel}
      vendorLabel={vendorLabel}
      className={className}
      onSend={(body) => sendVendorTokenMessage(token, body)}
    />
  );
}
