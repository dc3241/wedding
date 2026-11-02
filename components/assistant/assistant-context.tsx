"use client";

import {
  OPEN_ASSISTANT_EVENT,
  type OpenAssistantDetail,
} from "@/components/assistant/open-assistant-event";
import type { EventType } from "@/lib/event-type";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type AssistantContextValue = {
  eventType: EventType;
  open: boolean;
  openAssistant: (prefill?: string) => void;
  closeAssistant: () => void;
  pendingPrefill: string | null;
  clearPendingPrefill: () => void;
  markTabSuggestionShown: (segment: string) => void;
  hasShownTabSuggestion: (segment: string) => boolean;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({
  children,
  eventType = "wedding",
}: {
  children: ReactNode;
  eventType?: EventType;
}) {
  const [open, setOpen] = useState(false);
  const [pendingPrefill, setPendingPrefill] = useState<string | null>(null);
  const shownTabSuggestionsRef = useRef<Set<string>>(new Set());

  const openAssistant = useCallback((prefill?: string) => {
    if (prefill) {
      setPendingPrefill(prefill);
    }
    setOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setOpen(false);
  }, []);

  const clearPendingPrefill = useCallback(() => {
    setPendingPrefill(null);
  }, []);

  const markTabSuggestionShown = useCallback((segment: string) => {
    shownTabSuggestionsRef.current.add(segment);
  }, []);

  const hasShownTabSuggestion = useCallback((segment: string) => {
    return shownTabSuggestionsRef.current.has(segment);
  }, []);

  // Couple sidebar renders outside this provider — listen for its open request.
  useEffect(() => {
    function onOpenRequest(event: Event) {
      const detail = (event as CustomEvent<OpenAssistantDetail>).detail;
      openAssistant(detail?.prefill);
    }
    window.addEventListener(OPEN_ASSISTANT_EVENT, onOpenRequest);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, onOpenRequest);
  }, [openAssistant]);

  const value = useMemo(
    () => ({
      eventType,
      open,
      openAssistant,
      closeAssistant,
      pendingPrefill,
      clearPendingPrefill,
      markTabSuggestionShown,
      hasShownTabSuggestion,
    }),
    [
      eventType,
      open,
      openAssistant,
      closeAssistant,
      pendingPrefill,
      clearPendingPrefill,
      markTabSuggestionShown,
      hasShownTabSuggestion,
    ],
  );

  return (
    <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistant must be used within AssistantProvider");
  }
  return context;
}
