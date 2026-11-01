"use client";

import { useAssistant } from "@/components/assistant/assistant-context";
import { RAIL_ASSISTANT_ANCHOR_ATTR } from "@/components/assistant/open-assistant-event";
import {
  getTabSuggestion,
  pathnameToTabSegment,
  type TabSuggestion,
} from "@/components/assistant/tab-suggestions";
import { cn } from "@/lib/cn";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOOLTIP_AUTO_DISMISS_MS = 4000;

type Position =
  | { side: "right"; top: number; left: number }
  | { side: "below"; top: number; right: number };

/** First sidebar / mobile-bar Assistant button that is actually on screen. */
function findVisibleAnchor(): HTMLElement | null {
  const nodes = document.querySelectorAll<HTMLElement>(
    `[${RAIL_ASSISTANT_ANCHOR_ATTR}]`,
  );
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.right <= 0 || rect.left >= window.innerWidth) continue;
    return el;
  }
  return null;
}

function positionFor(anchor: HTMLElement): Position {
  const rect = anchor.getBoundingClientRect();
  if (rect.right < window.innerWidth / 2) {
    return {
      side: "right",
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
    };
  }
  return {
    side: "below",
    top: rect.bottom + 8,
    right: window.innerWidth - rect.right,
  };
}

/**
 * Couple counterpart of AssistantNavEntry's one-shot tab tooltip. The couple
 * Assistant button lives in the sidebar (outside AssistantProvider), so this
 * runs inside the project layout and floats the tooltip next to that button.
 */
export function RailAssistantSuggestion({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const {
    openAssistant,
    hasShownTabSuggestion,
    markTabSuggestionShown,
    eventType,
  } = useAssistant();
  const [suggestion, setSuggestion] = useState<TabSuggestion | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [visible, setVisible] = useState(false);
  const tooltipRef = useRef<HTMLButtonElement>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setVisible(false);
    setSuggestion(null);
  }, []);

  useEffect(() => {
    const segment = pathnameToTabSegment(pathname, projectId);
    const config = getTabSuggestion(segment, eventType);

    // Deferred so the reset isn't a synchronous setState inside the effect.
    const showTimer = setTimeout(() => {
      dismiss();
      if (!config || hasShownTabSuggestion(segment)) return;
      const anchor = findVisibleAnchor();
      if (!anchor) return;
      markTabSuggestionShown(segment);
      setSuggestion(config);
      setPosition(positionFor(anchor));
      setVisible(true);
      dismissTimerRef.current = setTimeout(dismiss, TOOLTIP_AUTO_DISMISS_MS);
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
    dismiss,
    hasShownTabSuggestion,
    markTabSuggestionShown,
    eventType,
  ]);

  useEffect(() => {
    if (!visible) return;

    function handlePointerDown(event: MouseEvent) {
      if (!tooltipRef.current?.contains(event.target as Node)) dismiss();
    }
    function handleViewportChange() {
      dismiss();
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [visible, dismiss]);

  if (!suggestion || !position) return null;

  return createPortal(
    <button
      ref={tooltipRef}
      type="button"
      onClick={() => {
        openAssistant(suggestion.prefill);
        dismiss();
      }}
      aria-live="polite"
      style={
        position.side === "right"
          ? { top: position.top, left: position.left }
          : { top: position.top, right: position.right }
      }
      className={cn(
        "fixed z-50 max-w-[220px] rounded-[var(--radius-inner)] border border-hairline bg-surface px-3 py-2.5 text-left text-[13px] leading-snug text-ink shadow-raised transition-[opacity,transform] duration-300 motion-reduce:transition-none",
        position.side === "right" && "-translate-y-1/2",
        visible
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
    >
      {suggestion.tooltip}
    </button>,
    document.body,
  );
}
