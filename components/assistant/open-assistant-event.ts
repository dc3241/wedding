/**
 * Bridge for controls that render OUTSIDE the project layout's
 * AssistantProvider — today the couple sidebar (CoupleShell), which lives in
 * the (app) shell above `projects/[projectId]/layout.tsx`.
 *
 * The sidebar dispatches; AssistantProvider listens and calls openAssistant.
 * When no provider is mounted (e.g. /account/billing) the event is a no-op.
 */
export const OPEN_ASSISTANT_EVENT = "firstlook:open-assistant";

export type OpenAssistantDetail = { prefill?: string };

export function requestOpenAssistant(prefill?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<OpenAssistantDetail>(OPEN_ASSISTANT_EVENT, {
      detail: { prefill },
    }),
  );
}

/** Marks the sidebar Assistant buttons so the tab-suggestion tooltip can anchor to them. */
export const RAIL_ASSISTANT_ANCHOR_ATTR = "data-rail-assistant";
