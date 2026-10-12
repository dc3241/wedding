"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { updateProjectEventSettings } from "@/app/(app)/projects/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  defaultHiddenTools,
  EVENT_TYPE_OPTIONS,
  eventTypeLabel,
  type EventType,
  type HideableTool,
} from "@/lib/event-type";

type EventSettingsContextValue = {
  editing: boolean;
  label: string;
  openEditor: () => void;
  panel: ReactNode;
};

const EventSettingsContext = createContext<EventSettingsContextValue | null>(
  null,
);

function useEventSettings() {
  const value = useContext(EventSettingsContext);
  if (!value) {
    throw new Error("Event settings controls must render inside the provider.");
  }
  return value;
}

/**
 * Collapsed type label in the project header. Seating and the website
 * stay editable in a row under the title; the overview no longer leads with them.
 */
export function EventSettingsProvider({
  projectId,
  eventType,
  hiddenTools,
  children,
}: {
  projectId: string;
  eventType: EventType;
  hiddenTools: readonly HideableTool[];
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<EventType>(eventType);
  const [includeSeating, setIncludeSeating] = useState(
    !hiddenTools.includes("seating"),
  );
  const [includeWebsite, setIncludeWebsite] = useState(
    !hiddenTools.includes("website"),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hiddenKey = hiddenTools.join(",");

  useEffect(() => {
    setType(eventType);
    setIncludeSeating(!hiddenKey.includes("seating"));
    setIncludeWebsite(!hiddenKey.includes("website"));
    setError(null);
  }, [eventType, hiddenKey]);

  function openEditor() {
    setType(eventType);
    setIncludeSeating(!hiddenTools.includes("seating"));
    setIncludeWebsite(!hiddenTools.includes("website"));
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setError(null);
    setEditing(false);
  }

  function changeType(next: EventType) {
    setType(next);
    const hidden = defaultHiddenTools(next);
    setIncludeSeating(!hidden.includes("seating"));
    setIncludeWebsite(!hidden.includes("website"));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateProjectEventSettings(projectId, {
        eventType: type,
        includeSeating,
        includeWebsite,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  const panel = editing ? (
    <div className="border-t border-hairline pt-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-[14px] font-medium text-ink">
          Type
          <Select
            compact
            fit
            aria-label="Event type"
            value={type}
            disabled={isPending}
            onChange={(e) =>
              changeType(e.target.value === "event" ? "event" : "wedding")
            }
          >
            {EVENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={includeSeating}
            disabled={isPending}
            onChange={(e) => setIncludeSeating(e.target.checked)}
          />
          Seating chart
        </label>
        <label className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={includeWebsite}
            disabled={isPending}
            onChange={(e) => setIncludeWebsite(e.target.checked)}
          />
          Website
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            disabled={isPending}
            onClick={save}
            className="px-3 py-1.5 text-[13px]"
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending}
            onClick={cancel}
            className="px-3 py-1.5 text-[13px]"
          >
            Cancel
          </Button>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  ) : null;

  return (
    <EventSettingsContext.Provider
      value={{
        editing,
        label: eventTypeLabel(eventType),
        openEditor,
        panel,
      }}
    >
      {children}
    </EventSettingsContext.Provider>
  );
}

export function EventSettingsTrigger() {
  const { editing, label, openEditor } = useEventSettings();
  if (editing) return null;

  return (
    <button
      type="button"
      onClick={openEditor}
      className="shrink-0 text-[14px] font-semibold text-accent hover:opacity-80"
    >
      {label}
    </button>
  );
}

export function EventSettingsPanel() {
  return useEventSettings().panel;
}
