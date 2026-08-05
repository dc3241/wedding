"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { PlaceResult } from "@/app/(app)/projects/[projectId]/vendors/search/actions";

export type VendorSearchCacheParams = {
  categoryId: string;
  location: string;
  refinement: string;
};

export type VendorSearchCacheEntry = {
  params: VendorSearchCacheParams;
  results: PlaceResult[];
  composedQuery: string;
  filteredCount: number;
};

type VendorSearchCacheContextValue = {
  get: (projectId: string) => VendorSearchCacheEntry | null;
  set: (projectId: string, entry: VendorSearchCacheEntry) => void;
};

const VendorSearchCacheContext =
  createContext<VendorSearchCacheContextValue | null>(null);

/**
 * Session-lived in-memory Places search cache, keyed by projectId.
 * Mounted in the persistent (app) shell — survives tab/project navigation,
 * dies on full reload. React state/ref only — no browser persistence APIs.
 */
export function VendorSearchCacheProvider({
  children,
}: {
  children: ReactNode;
}) {
  const cacheRef = useRef<Record<string, VendorSearchCacheEntry>>({});

  const value = useMemo<VendorSearchCacheContextValue>(
    () => ({
      get(projectId) {
        return cacheRef.current[projectId] ?? null;
      },
      set(projectId, entry) {
        cacheRef.current[projectId] = entry;
      },
    }),
    [],
  );

  return (
    <VendorSearchCacheContext.Provider value={value}>
      {children}
    </VendorSearchCacheContext.Provider>
  );
}

export function useVendorSearchCache(): VendorSearchCacheContextValue {
  const ctx = useContext(VendorSearchCacheContext);
  if (!ctx) {
    throw new Error(
      "useVendorSearchCache must be used within VendorSearchCacheProvider",
    );
  }
  return ctx;
}
