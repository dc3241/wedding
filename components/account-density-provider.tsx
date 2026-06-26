"use client";

import type { AccountKind } from "@/lib/account-context";
import { createContext, useContext } from "react";

const AccountDensityContext = createContext<AccountKind>("personal");

export function AccountDensityProvider({
  kind,
  children,
}: {
  kind: AccountKind;
  children: React.ReactNode;
}) {
  return (
    <AccountDensityContext.Provider value={kind}>
      {children}
    </AccountDensityContext.Provider>
  );
}

export function useAccountKind() {
  return useContext(AccountDensityContext);
}

export function useIsPlanner() {
  return useAccountKind() === "business";
}
