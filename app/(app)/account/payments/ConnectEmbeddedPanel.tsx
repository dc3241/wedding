"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountManagement,
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
  ConnectNotificationBanner,
  ConnectPayments,
  ConnectPayouts,
} from "@stripe/react-connect-js";
import { fetchConnectClientSecret } from "@/app/(app)/account/payments/actions";

export function ConnectEmbeddedPanel({
  publishableKey,
}: {
  publishableKey: string;
}) {
  const router = useRouter();
  const [instance, setInstance] = useState<ReturnType<
    typeof loadConnectAndInitialize
  > | null>(null);

  useEffect(() => {
    const connect = loadConnectAndInitialize({
      publishableKey,
      fetchClientSecret: fetchConnectClientSecret,
      appearance: {
        overlays: "dialog",
        variables: {
          colorPrimary: "#C0396B",
          colorBackground: "#FFFFFF",
          colorText: "#241C20",
          colorSecondaryText: "#857A80",
          buttonBorderRadius: "999px",
          borderRadius: "14px",
          fontFamily: "Figtree, sans-serif",
        },
      },
    });
    setInstance(connect);
  }, [publishableKey]);

  if (!instance) {
    return <p className="text-[14px] text-muted">Loading payments…</p>;
  }

  return (
    <ConnectComponentsProvider connectInstance={instance}>
      <div className="space-y-6">
        <ConnectNotificationBanner />
        <ConnectAccountOnboarding onExit={() => router.refresh()} />
        <ConnectPayments />
        <ConnectPayouts />
        <ConnectAccountManagement />
      </div>
    </ConnectComponentsProvider>
  );
}
