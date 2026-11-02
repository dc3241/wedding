"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Modal } from "@/components/ui/modal";
import { setProjectToolHidden } from "@/app/(app)/projects/actions";
import { cn } from "@/lib/cn";
import type { HideableTool } from "@/lib/event-type";
import {
  customizableTabsFor,
  projectTabHref,
  type ProjectTab,
} from "@/lib/project-tabs";
import type { AccountKind } from "@/lib/account-context";

export function WorkspaceToolsMenu({
  projectId,
  accountKind,
  projectMemberRole = null,
  hiddenTools,
  renderTrigger,
}: {
  projectId: string;
  accountKind: AccountKind | null;
  projectMemberRole?: string | null;
  hiddenTools: readonly HideableTool[];
  /**
   * Couple sidebar: supply the trigger and the panel opens in the shared
   * Modal (a popover would be clipped by the rail's scroll container).
   * Omit for the planner tab-strip popover.
   */
  renderTrigger?: (props: { open: boolean; onClick: () => void }) => ReactNode;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingTool, setPendingTool] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const tabs = customizableTabsFor(accountKind, projectMemberRole);
  const titleId = useId();
  const modalMode = renderTrigger !== undefined;
  // Stable: Modal's focus-trap effect depends on onClose.
  const close = useCallback(() => {
    setOpen(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open || modalMode) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setError(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setError(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, modalMode]);

  function toggle(tab: ProjectTab, show: boolean) {
    if (!tab.segment) return;
    setError(null);
    setPendingTool(tab.segment);
    startTransition(async () => {
      const result = await setProjectToolHidden(
        projectId,
        tab.segment,
        !show,
      );
      setPendingTool(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!show) {
        const path = projectTabHref(projectId, tab.segment);
        if (
          window.location.pathname === path ||
          window.location.pathname.startsWith(`${path}/`)
        ) {
          router.replace(projectTabHref(projectId, ""));
          return;
        }
      }
      router.refresh();
    });
  }

  if (tabs.length === 0) return null;

  const panelBody = (
    <>
      <p
        id={titleId}
        className="text-[15px] font-semibold text-ink"
      >
        Show in this workspace
      </p>
      <p className="mt-0.5 text-[13px] text-muted">
        Turning a tab off hides it. Nothing is deleted.
      </p>
      <ul className="mt-3 space-y-2">
        {tabs.map((tab) => {
          const checked = !hiddenTools.includes(
            tab.segment as HideableTool,
          );
          return (
            <li key={tab.segment}>
              <label className="flex items-center gap-2 text-[14px] font-medium text-ink">
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
                  checked={checked}
                  disabled={isPending}
                  onChange={(event) =>
                    toggle(tab, event.target.checked)
                  }
                />
                {tab.label}
                {pendingTool === tab.segment ? (
                  <span className="text-[13px] font-normal text-muted">
                    Saving…
                  </span>
                ) : null}
              </label>
              {tab.segment === "website" ? (
                <p className="mt-1 pl-6 text-[13px] text-muted">
                  Hiding Website only removes the tab. A live site stays
                  up until you unpublish it.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="mt-3 text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );

  if (modalMode) {
    return (
      <>
        {renderTrigger({
          open,
          onClick: () => {
            setOpen(true);
            setError(null);
          },
        })}
        {open ? (
          <Modal
            onClose={close}
            labelledBy={titleId}
            panelClassName="max-w-sm"
          >
            {panelBody}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-[var(--radius-inner)] px-3 py-1.5 text-sm font-medium text-muted hover:bg-well hover:text-ink"
              >
                Done
              </button>
            </div>
          </Modal>
        ) : null}
      </>
    );
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((value) => !value);
          setError(null);
        }}
        className={cn(
          "whitespace-nowrap rounded-[var(--radius-inner)] px-3 py-1.5 text-sm text-muted no-underline transition-[color,background] duration-150 hover:text-ink",
          open && "font-semibold text-ink",
        )}
      >
        Customize
      </button>
      {open ? (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),20rem)] rounded-[var(--radius-card)] bg-surface p-4 shadow-raised"
        >
          {panelBody}
        </div>
      ) : null}
    </div>
  );
}
