"use client";

import { moveArrayItem, ReorderButtons } from "./ReorderButtons";
import {
  TRAVEL_PLACE_KINDS,
  type TravelPlace,
  type TravelPlaceKind,
} from "@/components/website/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TravelEditorFieldsProps = {
  body: string;
  places: TravelPlace[];
  onBodyChange: (body: string) => void;
  onPlacesChange: (places: TravelPlace[]) => void;
};

function emptyPlace(): TravelPlace {
  return { kind: "stay", name: "" };
}

export function TravelEditorFields({
  body,
  places,
  onBodyChange,
  onPlacesChange,
}: TravelEditorFieldsProps) {
  function addPlace() {
    onPlacesChange([...places, emptyPlace()]);
  }

  function updatePlace(index: number, patch: Partial<TravelPlace>) {
    onPlacesChange(
      places.map((place, i) => {
        if (i !== index) return place;
        const next: TravelPlace = {
          kind: patch.kind ?? place.kind,
          name: patch.name !== undefined ? patch.name : place.name,
        };
        const detail = patch.detail !== undefined ? patch.detail : place.detail;
        const url = patch.url !== undefined ? patch.url : place.url;
        const note = patch.note !== undefined ? patch.note : place.note;
        if (detail?.trim()) next.detail = detail.trim();
        if (url?.trim()) next.url = url.trim();
        if (note?.trim()) next.note = note.trim();
        return next;
      }),
    );
  }

  function removeAt(index: number) {
    onPlacesChange(places.filter((_, i) => i !== index));
  }

  function move(from: number, to: number) {
    onPlacesChange(moveArrayItem(places, from, to));
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[13px] text-muted">
          Intro (optional)
        </label>
        <Textarea
          rows={3}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="A short note for guests about getting there and where to stay…"
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-ink">Places</p>
          <Button type="button" variant="default" onClick={addPlace}>
            Add place
          </Button>
        </div>

        {places.length === 0 ? (
          <p className="text-[13px] text-muted">
            Add hotels, airports, or other tips as cards with optional links.
          </p>
        ) : (
          <ul className="space-y-3">
            {places.map((place, index) => (
              <li
                key={index}
                className="space-y-3 rounded-[var(--radius-inner)] bg-well p-3 shadow-recessed"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] text-muted">
                    Place {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <ReorderButtons
                      index={index}
                      total={places.length}
                      onMove={move}
                      label={`place ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      className="text-[12px] font-medium text-rosewood hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                  <div>
                    <label className="mb-1.5 block text-[13px] text-muted">
                      Kind
                    </label>
                    <select
                      value={place.kind}
                      onChange={(e) =>
                        updatePlace(index, {
                          kind: e.target.value as TravelPlaceKind,
                        })
                      }
                      className="w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3 py-2 text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {TRAVEL_PLACE_KINDS.map((kind) => (
                        <option key={kind.value} value={kind.value}>
                          {kind.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] text-muted">
                      Name
                    </label>
                    <Input
                      value={place.name}
                      onChange={(e) =>
                        updatePlace(index, { name: e.target.value })
                      }
                      placeholder="Capri Laguna"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] text-muted">
                    Detail
                  </label>
                  <Textarea
                    rows={2}
                    value={place.detail ?? ""}
                    onChange={(e) =>
                      updatePlace(index, { detail: e.target.value })
                    }
                    placeholder="Address, distance, or a short description…"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] text-muted">
                      Link (optional)
                    </label>
                    <Input
                      type="url"
                      value={place.url ?? ""}
                      onChange={(e) =>
                        updatePlace(index, { url: e.target.value })
                      }
                      placeholder="https://…"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] text-muted">
                      Note (optional)
                    </label>
                    <Input
                      value={place.note ?? ""}
                      onChange={(e) =>
                        updatePlace(index, { note: e.target.value })
                      }
                      placeholder="Block code ROOMLOVE, etc."
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
