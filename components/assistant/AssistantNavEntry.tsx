"use client";

import { useAssistant } from "@/components/assistant/assistant-context";
import { AssistantSparkleIcon } from "@/components/assistant/AssistantSparkleIcon";
import {
  getTabSuggestion,
  pathnameToTabSegment,
  type TabSuggestion,
} from "@/components/assistant/tab-suggestions";
import { cn } from "@/lib/cn";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const TOOLTIP_AUTO_DISMISS_MS = 4000;

export function AssistantNavEntry({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const {
    openAssistant,
    hasShownTabSuggestion,
    markTabSuggestionShown,
  } = useAssistant();
  const [suggestion, setSuggestion] = useState<TabSuggestion | null>(null);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissSuggestion = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setVisible(false);
    setSuggestion(null);
  }, []);

  const openWithSuggestion = useCallback(
    (prefill: string) => {
      openAssistant(prefill);
      dismissSuggestion();
    },
    [openAssistant, dismissSuggestion],
  );

  useEffect(() => {
    dismissSuggestion();

    const segment = pathnameToTabSegment(pathname, projectId);
    const config = getTabSuggestion(segment);
    if (!config || hasShownTabSuggestion(segment)) return;

    markTabSuggestionShown(segment);
    setSuggestion(config);

    const showTimer = setTimeout(() => {
      setVisible(true);
      dismissTimerRef.current = setTimeout(
        dismissSuggestion,
        TOOLTIP_AUTO_DISMISS_MS,
      );
    }, 0);

    return () => {
      clearTimeout(showTimer);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [
    pathname,
    projectId,
    dismissSuggestion,
    hasShownTabSuggestion,
    markTabSuggestionShown,
  ]);

  useEffect(() => {
    if (!visible) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        dismissSuggestion();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [visible, dismissSuggestion]);

  function handleChipClick() {
    if (visible && suggestion) {
      openWithSuggestion(suggestion.prefill);
      return;
    }
    openAssistant();
  }

  return (
    <div ref={rootRef} className="relative ml-auto">
      {suggestion ? (
        <button
          type="button"
          onClick={() => openWithSuggestion(suggestion.prefill)}
          aria-live="polite"
          className={cn(
            "absolute right-0 top-full z-50 mt-2 max-w-[220px] rounded-[var(--radius-inner)] border border-hairline bg-surface px-3 py-2.5 text-left text-[13px] leading-snug text-ink shadow-raised transition-[opacity,transform] duration-300 motion-reduce:transition-none",
            visible
              ? "pointer-events-auto scale-100 opacity-100"
              : "pointer-events-none scale-[0.97] opacity-0",
          )}
        >
          {suggestion.tooltip}
        </button>
      ) : null}

      <button
        type="button"
        onClick={handleChipClick}
        aria-expanded={visible}
        aria-controls="assistant-panel"
        className="flex items-center gap-2 rounded-full border border-accent bg-accent px-3.5 py-2 text-sm font-medium text-surface transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <AssistantSparkleIcon className="size-[18px] text-surface" />
        Assistant
      </button>
    </div>
  );
}
