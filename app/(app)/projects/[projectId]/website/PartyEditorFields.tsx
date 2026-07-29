"use client";

import { useRef, useState } from "react";
import { moveArrayItem, ReorderButtons } from "./ReorderButtons";
import {
  uploadWebsiteImage,
  WEBSITE_IMAGE_ACCEPT,
} from "./website-media";
import type { PartyMember } from "@/components/website/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PartyEditorFieldsProps = {
  projectId: string;
  heading?: string;
  members: PartyMember[];
  onHeadingChange: (heading: string) => void;
  onChange: (members: PartyMember[]) => void;
};

export function PartyEditorFields({
  projectId,
  heading,
  members,
  onHeadingChange,
  onChange,
}: PartyEditorFieldsProps) {
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function addMember() {
    onChange([...members, { name: "" }]);
  }

  function updateMember(
    index: number,
    patch: Partial<Pick<PartyMember, "name" | "role" | "imageUrl">>,
  ) {
    onChange(
      members.map((member, i) => {
        if (i !== index) return member;
        const next: PartyMember = {
          name: patch.name !== undefined ? patch.name : member.name,
        };
        const role = patch.role !== undefined ? patch.role : member.role;
        const imageUrl =
          patch.imageUrl !== undefined ? patch.imageUrl : member.imageUrl;
        if (role?.trim()) next.role = role.trim();
        if (imageUrl?.trim()) next.imageUrl = imageUrl.trim();
        return next;
      }),
    );
  }

  function removeAt(index: number) {
    onChange(members.filter((_, i) => i !== index));
  }

  function move(from: number, to: number) {
    onChange(moveArrayItem(members, from, to));
  }

  async function handlePhotoSelected(
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setUploadingIndex(index);
    try {
      const uploaded = await uploadWebsiteImage(projectId, "party", file);
      if ("error" in uploaded) {
        setError(uploaded.error);
        return;
      }
      updateMember(index, { imageUrl: uploaded.url });
    } finally {
      setUploadingIndex(null);
    }
  }

  function clearPhoto(index: number) {
    const member = members[index];
    if (!member) return;
    const next: PartyMember = { name: member.name };
    if (member.role) next.role = member.role;
    onChange(members.map((m, i) => (i === index ? next : m)));
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[13px] text-muted">
          Heading (optional)
        </label>
        <Input
          value={heading ?? ""}
          onChange={(e) => onHeadingChange(e.target.value)}
          placeholder="Wedding party"
        />
      </div>

      {members.length === 0 ? (
        <p className="text-[13px] text-muted">
          No members yet. Add people in your wedding party.
        </p>
      ) : (
        <ul className="space-y-3">
          {members.map((member, index) => (
            <li
              key={index}
              className="space-y-3 rounded-[var(--radius-inner)] bg-well p-3 shadow-recessed"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] text-muted">Member {index + 1}</span>
                <div className="flex items-center gap-2">
                  <ReorderButtons
                    index={index}
                    total={members.length}
                    onMove={move}
                    disabled={uploadingIndex !== null}
                    label={`member ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    disabled={uploadingIndex !== null}
                    className="text-[13px] text-muted hover:text-rosewood"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="size-20 shrink-0 overflow-hidden rounded-full bg-surface">
                  {member.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- public website-media URL
                    <img
                      src={member.imageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[11px] text-muted">
                      Photo
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <input
                    ref={(el) => {
                      fileRefs.current[index] = el;
                    }}
                    type="file"
                    accept={WEBSITE_IMAGE_ACCEPT}
                    className="sr-only"
                    onChange={(e) => handlePhotoSelected(index, e)}
                  />
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => fileRefs.current[index]?.click()}
                    disabled={uploadingIndex !== null}
                    className="px-3 py-1.5 text-[13px]"
                  >
                    {uploadingIndex === index
                      ? "Uploading…"
                      : member.imageUrl
                        ? "Replace photo"
                        : "Add photo"}
                  </Button>
                  {member.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => clearPhoto(index)}
                      disabled={uploadingIndex !== null}
                      className="text-[13px] text-muted hover:text-rosewood"
                    >
                      Remove photo
                    </button>
                  ) : null}
                </div>
              </div>

              <Input
                value={member.name}
                onChange={(e) => updateMember(index, { name: e.target.value })}
                placeholder="Name"
                disabled={uploadingIndex !== null}
              />
              <Input
                value={member.role ?? ""}
                onChange={(e) => updateMember(index, { role: e.target.value })}
                placeholder="Role (optional)"
                disabled={uploadingIndex !== null}
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="default"
        onClick={addMember}
        disabled={uploadingIndex !== null}
      >
        Add member
      </Button>
      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
