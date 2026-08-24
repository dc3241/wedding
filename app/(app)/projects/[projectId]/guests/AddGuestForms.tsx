"use client";

import { useState, useTransition } from "react";
import { addGuest } from "./actions";
import type { GuestMemberType, PrimaryMemberOption } from "./types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CollapseSection } from "@/components/ui/collapse-section";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  SegmentedToggle,
  SegmentedToggleItem,
} from "@/components/ui/topbar";
import { GUEST_RELATIONSHIPS } from "@/lib/guest-relationships";
import type { ResolvedPartnerSides } from "@/lib/partner-sides";

export function AddGuestForms({
  projectId,
  partnerSides,
  primaryOptions = [],
}: {
  projectId: string;
  partnerSides: ResolvedPartnerSides;
  primaryOptions?: PrimaryMemberOption[];
}) {
  const [isAddPending, startAddTransition] = useTransition();
  const [partySize, setPartySize] = useState(1);
  const [memberType, setMemberType] = useState<GuestMemberType>("adult");
  const [primaryMemberId, setPrimaryMemberId] = useState("");

  const associating = Boolean(primaryMemberId);
  const additionalSlots = associating ? 0 : Math.max(0, partySize - 1);

  function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const name = (form.get("name") as string) ?? "";
    const household = (form.get("household") as string) ?? "";
    const phone = (form.get("phone") as string) ?? "";
    const address = (form.get("address") as string) ?? "";
    const size = associating ? 1 : Number(form.get("party_size") ?? 1);
    const primarySide = (form.get("relationship_side") as string) ?? "";
    const primaryRelationship = (form.get("relationship") as string) ?? "";

    const additionalPeople: Array<{
      name: string;
      relationship_side: string;
      relationship: string;
    }> = [];
    if (!associating) {
      for (let i = 0; i < Math.max(0, size - 1); i++) {
        additionalPeople.push({
          name: (form.get(`additional_name_${i}`) as string) ?? "",
          relationship_side:
            (form.get(`additional_relationship_side_${i}`) as string) ?? "",
          relationship:
            (form.get(`additional_relationship_${i}`) as string) ?? "",
        });
      }
    }

    if (!name.trim()) return;

    startAddTransition(async () => {
      await addGuest(
        projectId,
        name,
        household,
        phone,
        size,
        additionalPeople,
        address,
        {
          relationship_side: primarySide,
          relationship: primaryRelationship,
        },
        {
          member_type: memberType,
          primaryMemberId: primaryMemberId || null,
        },
      );
      formEl.reset();
      setPartySize(1);
      setMemberType("adult");
      setPrimaryMemberId("");
    });
  }

  return (
    <Card data-tour="guests-add" className="px-6 py-5">
      <CollapseSection
        defaultOpen
        title={
          <div>
            <Eyebrow>Add guest</Eyebrow>
            <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              One at a time
            </h2>
          </div>
        }
        bodyClassName="mt-4"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="guest-name"
                className="text-[14px] font-medium text-ink"
              >
                Full name
              </label>
              <Input
                id="guest-name"
                name="name"
                type="text"
                required
                placeholder="Full name"
                disabled={isAddPending}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <p
                className="text-[14px] font-medium text-ink"
                id="guest-member-type-label"
              >
                Adult / Child
              </p>
              <SegmentedToggle
                aria-labelledby="guest-member-type-label"
                className="w-fit p-0.5"
              >
                <SegmentedToggleItem
                  active={memberType === "adult"}
                  aria-pressed={memberType === "adult"}
                  onClick={() => setMemberType("adult")}
                  disabled={isAddPending}
                  className="px-3 py-1 text-[12px] font-semibold"
                >
                  Adult
                </SegmentedToggleItem>
                <SegmentedToggleItem
                  active={memberType === "child"}
                  aria-pressed={memberType === "child"}
                  onClick={() => setMemberType("child")}
                  disabled={isAddPending}
                  className="px-3 py-1 text-[12px] font-semibold"
                >
                  Child
                </SegmentedToggleItem>
              </SegmentedToggle>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor="guest-of"
                className="text-[14px] font-medium text-ink"
              >
                Guest of{" "}
                <span className="font-normal text-muted">(optional)</span>
              </label>
              <Select
                id="guest-of"
                value={primaryMemberId}
                onChange={(e) => {
                  const next = e.target.value;
                  setPrimaryMemberId(next);
                  if (next) setPartySize(1);
                }}
                disabled={isAddPending}
              >
                <option value="">New household</option>
                {primaryOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="guest-relationship-side"
                  className="text-[14px] font-medium text-ink"
                >
                  Relationship to
                </label>
                <Select
                  id="guest-relationship-side"
                  name="relationship_side"
                  defaultValue=""
                  disabled={isAddPending}
                >
                  <option value="">Select…</option>
                  {partnerSides.options.map((side) => (
                    <option key={side.token} value={side.token}>
                      {side.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="guest-relationship"
                  className="text-[14px] font-medium text-ink"
                >
                  Relationship
                </label>
                <Select
                  id="guest-relationship"
                  name="relationship"
                  defaultValue=""
                  disabled={isAddPending}
                >
                  <option value="">Select…</option>
                  {GUEST_RELATIONSHIPS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {Array.from({ length: additionalSlots }, (_, index) => (
              <div
                key={index}
                className="space-y-3 rounded-[var(--radius-inner)] bg-well p-3 shadow-recessed sm:col-span-2"
              >
                <div className="space-y-1.5">
                  <label
                    htmlFor={`guest-additional-name-${index}`}
                    className="text-[14px] font-medium text-ink"
                  >
                    Guest {index + 2}
                  </label>
                  <Input
                    id={`guest-additional-name-${index}`}
                    name={`additional_name_${index}`}
                    type="text"
                    placeholder={`Guest ${index + 2}`}
                    disabled={isAddPending}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`guest-additional-side-${index}`}
                      className="text-[14px] font-medium text-ink"
                    >
                      Relationship to
                    </label>
                    <Select
                      id={`guest-additional-side-${index}`}
                      name={`additional_relationship_side_${index}`}
                      defaultValue=""
                      disabled={isAddPending}
                    >
                      <option value="">Select…</option>
                      {partnerSides.options.map((side) => (
                        <option key={side.token} value={side.token}>
                          {side.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`guest-additional-relationship-${index}`}
                      className="text-[14px] font-medium text-ink"
                    >
                      Relationship
                    </label>
                    <Select
                      id={`guest-additional-relationship-${index}`}
                      name={`additional_relationship_${index}`}
                      defaultValue=""
                      disabled={isAddPending}
                    >
                      <option value="">Select…</option>
                      {GUEST_RELATIONSHIPS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            {!associating ? (
              <>
                <div className="space-y-1.5">
                  <label
                    htmlFor="guest-household"
                    className="text-[14px] font-medium text-ink"
                  >
                    Household
                  </label>
                  <Input
                    id="guest-household"
                    name="household"
                    type="text"
                    placeholder="e.g. Smith family"
                    disabled={isAddPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="guest-phone"
                    className="text-[14px] font-medium text-ink"
                  >
                    Phone
                  </label>
                  <Input
                    id="guest-phone"
                    name="phone"
                    type="tel"
                    placeholder="(555) 555-5555"
                    disabled={isAddPending}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="guest-address"
                    className="text-[14px] font-medium text-ink"
                  >
                    Address
                  </label>
                  <Input
                    id="guest-address"
                    name="address"
                    type="text"
                    placeholder="Mailing address"
                    disabled={isAddPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="guest-party-size"
                    className="text-[14px] font-medium text-ink"
                  >
                    Party size
                  </label>
                  <Input
                    id="guest-party-size"
                    name="party_size"
                    type="number"
                    min={1}
                    value={partySize}
                    onChange={(e) => {
                      const next = Math.max(1, Number(e.target.value) || 1);
                      setPartySize(next);
                    }}
                    disabled={isAddPending}
                  />
                </div>
              </>
            ) : null}
          </div>
          <Button type="submit" variant="primary" disabled={isAddPending}>
            {isAddPending ? "Adding…" : "Add guest"}
          </Button>
        </form>
      </CollapseSection>
    </Card>
  );
}
