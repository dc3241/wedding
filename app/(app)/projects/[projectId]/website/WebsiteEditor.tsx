"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  fillWebsiteScheduleFromTimeline,
  setWeddingWebsitePublished,
  updateWeddingWebsite,
  updateWeddingWebsiteSlug,
} from "./actions";
import { HeroImageField } from "./HeroImageField";
import { GalleryEditorFields } from "./GalleryEditorFields";
import { PartyEditorFields } from "./PartyEditorFields";
import { FaqEditorFields } from "./FaqEditorFields";
import { TravelEditorFields } from "./TravelEditorFields";
import { LookStep } from "./LookStep";
import { WebsiteRsvpShare } from "./WebsiteRsvpShare";
import { ExternalRegistryEditor } from "./ExternalRegistryEditor";
import { moveArrayItem, ReorderButtons } from "./ReorderButtons";
import type { ExternalRegistryLink } from "@/components/website/registry/types";
import type {
  ScheduleLayout,
  WebsiteSectionId,
  WeddingWebsiteContent,
  WeddingWebsiteRow,
} from "@/components/website/types";
import { resolveSectionOrder } from "@/components/website/types";
import { WeddingSiteView } from "@/components/website/WeddingSiteView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import type { AccountKind } from "@/lib/account-context";

type WebsiteEditorProps = {
  projectId: string;
  website: WeddingWebsiteRow;
  accountKind: AccountKind;
  externalRegistryLinks: ExternalRegistryLink[];
};

const SECTION_EDITOR_TITLE: Record<WebsiteSectionId, string> = {
  story: "Our story",
  details: "Wedding details",
  schedule: "Schedule",
  gallery: "Gallery",
  party: "Wedding party",
  travel: "Travel & stay",
  faq: "FAQ",
};

function VisibilityToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-2 text-[13px] text-muted"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-hairline accent-accent"
      />
      {label}
    </label>
  );
}

function EditorSection({
  title,
  visible,
  onVisibleChange,
  children,
  defaultOpen = false,
  reorder,
}: {
  title: string;
  visible?: boolean;
  onVisibleChange?: (next: boolean) => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
  reorder?: {
    index: number;
    total: number;
    onMove: (from: number, to: number) => void;
    label: string;
  };
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <Card className="space-y-4 px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <button
            type="button"
            data-tour="website-section-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((current) => !current)}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <span
              className="text-[12px] font-medium text-muted tabular-nums"
              aria-hidden
            >
              {open ? "▾" : "▸"}
            </span>
            <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              {title}
            </h2>
          </button>
          {reorder ? (
            <div
              data-tour="website-section-reorder"
              onClick={(e) => e.stopPropagation()}
            >
              <ReorderButtons
                index={reorder.index}
                total={reorder.total}
                onMove={reorder.onMove}
                label={reorder.label}
              />
            </div>
          ) : null}
        </div>
        {onVisibleChange !== undefined && visible !== undefined ? (
          <VisibilityToggle
            checked={visible}
            onChange={onVisibleChange}
            label="Show on site"
          />
        ) : null}
      </div>
      {open ? (
        <div id={panelId} className="space-y-4">
          {children}
        </div>
      ) : null}
    </Card>
  );
}

export function WebsiteEditor({
  projectId,
  website,
  accountKind,
  externalRegistryLinks,
}: WebsiteEditorProps) {
  const [content, setContent] = useState<WeddingWebsiteContent>(website.content);
  const [template, setTemplate] = useState(website.template);
  const [theme, setTheme] = useState(website.theme);
  const [slugInput, setSlugInput] = useState(website.slug ?? "");
  const [savedSlug, setSavedSlug] = useState(website.slug);
  const [published, setPublished] = useState(website.published);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scheduleFillForProject = useRef<string | null>(null);

  const isPlanner = accountKind === "business";

  useEffect(() => {
    setContent(website.content);
    setTemplate(website.template);
    setTheme(website.theme);
    setSlugInput(website.slug ?? "");
    setSavedSlug(website.slug);
    setPublished(website.published);
  }, [website]);

  // WEB-SCHED-01: one-time fill-if-empty from day-of timeline (no button).
  useEffect(() => {
    if (scheduleFillForProject.current === projectId) return;
    if (website.content.schedule.items.length > 0) {
      scheduleFillForProject.current = projectId;
      return;
    }
    scheduleFillForProject.current = projectId;

    let cancelled = false;
    startTransition(async () => {
      const result = await fillWebsiteScheduleFromTimeline(projectId);
      if (cancelled || !result.ok || !result.filled) return;
      setContent((prev) => ({
        ...prev,
        schedule: { ...prev.schedule, items: result.items },
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, website.content.schedule.items.length, startTransition]);

  function persistContent(next: WeddingWebsiteContent) {
    setContent(next);
    startTransition(async () => {
      const result = await updateWeddingWebsite(projectId, { content: next });
      if (!result.ok) setSaveError(result.error);
      else setSaveError(null);
    });
  }

  function persistTemplate(next: string) {
    setTemplate(next);
    startTransition(async () => {
      await updateWeddingWebsite(projectId, { template: next });
    });
  }

  function persistTheme(next: string) {
    setTheme(next);
    startTransition(async () => {
      await updateWeddingWebsite(projectId, { theme: next });
    });
  }

  function saveSlug() {
    setSlugError(null);
    startTransition(async () => {
      const result = await updateWeddingWebsiteSlug(projectId, slugInput);
      if (!result.ok) {
        setSlugError(result.error);
        return;
      }
      setSavedSlug(result.slug);
      setSlugInput(result.slug);
    });
  }

  function togglePublished() {
    const next = !published;
    setPublished(next);
    startTransition(async () => {
      const result = await setWeddingWebsitePublished(projectId, next);
      if (!result.ok) {
        setPublished(!next);
        setSaveError(result.error);
      }
    });
  }

  function updateHero<K extends keyof WeddingWebsiteContent["hero"]>(
    key: K,
    value: WeddingWebsiteContent["hero"][K],
  ) {
    persistContent({ ...content, hero: { ...content.hero, [key]: value } });
  }

  function updateStory<K extends keyof WeddingWebsiteContent["story"]>(
    key: K,
    value: WeddingWebsiteContent["story"][K],
  ) {
    persistContent({ ...content, story: { ...content.story, [key]: value } });
  }

  function updateDetails<K extends keyof WeddingWebsiteContent["details"]>(
    key: K,
    value: WeddingWebsiteContent["details"][K],
  ) {
    persistContent({ ...content, details: { ...content.details, [key]: value } });
  }

  function updateTravel(patch: Partial<WeddingWebsiteContent["travel"]>) {
    persistContent({
      ...content,
      travel: { ...content.travel, ...patch },
    });
  }

  function setTravelVisible(visible: boolean) {
    updateTravel({ visible });
  }

  function setRsvpVisible(visible: boolean) {
    persistContent({ ...content, rsvp: { ...content.rsvp, visible } });
  }

  function setGalleryVisible(visible: boolean) {
    persistContent({
      ...content,
      gallery: { ...content.gallery, visible },
    });
  }

  function setPartyVisible(visible: boolean) {
    persistContent({
      ...content,
      party: { ...content.party, visible },
    });
  }

  function setFaqVisible(visible: boolean) {
    persistContent({
      ...content,
      faq: { ...content.faq, visible },
    });
  }

  function addScheduleItem() {
    persistContent({
      ...content,
      schedule: {
        ...content.schedule,
        items: [...content.schedule.items, { time: "", title: "", description: "" }],
      },
    });
  }

  function updateScheduleItem(
    index: number,
    field: "time" | "title" | "description",
    value: string,
  ) {
    const items = content.schedule.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    persistContent({ ...content, schedule: { ...content.schedule, items } });
  }

  function removeScheduleItem(index: number) {
    persistContent({
      ...content,
      schedule: {
        ...content.schedule,
        items: content.schedule.items.filter((_, i) => i !== index),
      },
    });
  }

  const sectionOrder = resolveSectionOrder(content);

  function moveSection(from: number, to: number) {
    persistContent({
      ...content,
      sectionOrder: moveArrayItem(sectionOrder, from, to),
    });
  }

  function renderReorderableSection(id: WebsiteSectionId, index: number) {
    const reorder = {
      index,
      total: sectionOrder.length,
      onMove: moveSection,
      label: SECTION_EDITOR_TITLE[id],
    };

    switch (id) {
      case "story":
        return (
          <EditorSection
            key={id}
            title={SECTION_EDITOR_TITLE.story}
            visible={content.story.visible}
            onVisibleChange={(next) => updateStory("visible", next)}
            reorder={reorder}
          >
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[13px] text-muted">Heading</label>
                <Input
                  value={content.story.heading}
                  onChange={(e) => updateStory("heading", e.target.value)}
                  placeholder="How It All Began"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-muted">Body</label>
                <Textarea
                  rows={5}
                  value={content.story.body}
                  onChange={(e) => updateStory("body", e.target.value)}
                  placeholder="How you met, the proposal, what you are excited for…"
                />
              </div>
            </div>
          </EditorSection>
        );
      case "details":
        return (
          <EditorSection
            key={id}
            title={SECTION_EDITOR_TITLE.details}
            visible={content.details.visible}
            onVisibleChange={(next) => updateDetails("visible", next)}
            reorder={reorder}
          >
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-[13px] font-medium text-ink">Ceremony</p>
                <Input
                  value={content.details.ceremonyVenue}
                  onChange={(e) => updateDetails("ceremonyVenue", e.target.value)}
                  placeholder="Venue name"
                />
                <Textarea
                  rows={2}
                  value={content.details.ceremonyAddress}
                  onChange={(e) => updateDetails("ceremonyAddress", e.target.value)}
                  placeholder="Address"
                />
                <Input
                  value={content.details.ceremonyTime}
                  onChange={(e) => updateDetails("ceremonyTime", e.target.value)}
                  placeholder="Time, e.g. 4:00 PM"
                />
              </div>
              <div className="space-y-3 border-t border-hairline pt-4">
                <p className="text-[13px] font-medium text-ink">Reception</p>
                <Input
                  value={content.details.receptionVenue}
                  onChange={(e) => updateDetails("receptionVenue", e.target.value)}
                  placeholder="Venue name"
                />
                <Textarea
                  rows={2}
                  value={content.details.receptionAddress}
                  onChange={(e) =>
                    updateDetails("receptionAddress", e.target.value)
                  }
                  placeholder="Address"
                />
                <Input
                  value={content.details.receptionTime}
                  onChange={(e) => updateDetails("receptionTime", e.target.value)}
                  placeholder="Time, e.g. 6:00 PM"
                />
              </div>
            </div>
          </EditorSection>
        );
      case "schedule":
        return (
          <EditorSection
            key={id}
            title={SECTION_EDITOR_TITLE.schedule}
            visible={content.schedule.visible}
            onVisibleChange={(next) =>
              persistContent({
                ...content,
                schedule: { ...content.schedule, visible: next },
              })
            }
            reorder={reorder}
          >
            <div data-tour="website-timeline-layout">
              <label
                htmlFor="schedule-layout"
                className="mb-1.5 block text-[13px] text-muted"
              >
                Timeline layout
              </label>
              <Select
                id="schedule-layout"
                value={content.schedule.layout ?? "centered"}
                onChange={(e) =>
                  persistContent({
                    ...content,
                    schedule: {
                      ...content.schedule,
                      layout: e.target.value as ScheduleLayout,
                    },
                  })
                }
              >
                <option value="centered">Centered</option>
                <option value="alternating">Alternating</option>
                <option value="rail">Left rail</option>
              </Select>
            </div>
            <ul className="space-y-4">
              {content.schedule.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="space-y-2 rounded-[var(--radius-inner)] bg-well p-3 shadow-recessed"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-muted">
                      Item {itemIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeScheduleItem(itemIndex)}
                      className="text-[13px] text-muted hover:text-rosewood"
                    >
                      Remove
                    </button>
                  </div>
                  <Input
                    value={item.time}
                    onChange={(e) =>
                      updateScheduleItem(itemIndex, "time", e.target.value)
                    }
                    placeholder="Time"
                  />
                  <Input
                    value={item.title}
                    onChange={(e) =>
                      updateScheduleItem(itemIndex, "title", e.target.value)
                    }
                    placeholder="Title"
                  />
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      updateScheduleItem(itemIndex, "description", e.target.value)
                    }
                    placeholder="Description (optional)"
                  />
                </li>
              ))}
            </ul>
            <Button type="button" variant="default" onClick={addScheduleItem}>
              Add schedule item
            </Button>
          </EditorSection>
        );
      case "gallery":
        return (
          <EditorSection
            key={id}
            title={SECTION_EDITOR_TITLE.gallery}
            visible={content.gallery.visible}
            onVisibleChange={setGalleryVisible}
            reorder={reorder}
          >
            <p className="text-[13px] text-muted">
              Photos appear on your site only when this section is shown and has at
              least one image. Removing a photo clears it from the site; storage
              cleanup is deferred.
            </p>
            <GalleryEditorFields
              projectId={projectId}
              images={content.gallery.images}
              imageShape={content.gallery.imageShape}
              onChange={(images) =>
                persistContent({
                  ...content,
                  gallery: { ...content.gallery, images },
                })
              }
              onImageShapeChange={(imageShape) =>
                persistContent({
                  ...content,
                  gallery: {
                    ...content.gallery,
                    imageShape: imageShape ?? (null as unknown as undefined),
                  },
                })
              }
            />
          </EditorSection>
        );
      case "party":
        return (
          <EditorSection
            key={id}
            title={SECTION_EDITOR_TITLE.party}
            visible={content.party.visible}
            onVisibleChange={setPartyVisible}
            reorder={reorder}
          >
            <p className="text-[13px] text-muted">
              Members appear when this section is shown and has at least one person
              with a name.
            </p>
            <PartyEditorFields
              projectId={projectId}
              heading={content.party.heading}
              layout={content.party.layout}
              imageShape={content.party.imageShape}
              members={content.party.members}
              onHeadingChange={(heading) =>
                persistContent({
                  ...content,
                  party: {
                    ...content.party,
                    heading: heading.trim() || undefined,
                  },
                })
              }
              onLayoutChange={(layout) =>
                persistContent({
                  ...content,
                  party: { ...content.party, layout },
                })
              }
              onImageShapeChange={(imageShape) =>
                persistContent({
                  ...content,
                  party: {
                    ...content.party,
                    imageShape: imageShape ?? (null as unknown as undefined),
                  },
                })
              }
              onChange={(members) =>
                persistContent({
                  ...content,
                  party: { ...content.party, members },
                })
              }
            />
          </EditorSection>
        );
      case "travel":
        return (
          <EditorSection
            key={id}
            title={SECTION_EDITOR_TITLE.travel}
            visible={content.travel.visible}
            onVisibleChange={setTravelVisible}
            reorder={reorder}
          >
            <TravelEditorFields
              body={content.travel.body}
              places={content.travel.places}
              onBodyChange={(body) => updateTravel({ body })}
              onPlacesChange={(places) => updateTravel({ places })}
            />
          </EditorSection>
        );
      case "faq":
        return (
          <EditorSection
            key={id}
            title={SECTION_EDITOR_TITLE.faq}
            visible={content.faq.visible}
            onVisibleChange={setFaqVisible}
            reorder={reorder}
          >
            <p className="text-[13px] text-muted">
              Questions appear when this section is shown and has at least one
              complete Q&amp;A.
            </p>
            <FaqEditorFields
              heading={content.faq.heading}
              items={content.faq.items}
              onHeadingChange={(heading) =>
                persistContent({
                  ...content,
                  faq: {
                    ...content.faq,
                    heading: heading.trim() || undefined,
                  },
                })
              }
              onChange={(items) =>
                persistContent({
                  ...content,
                  faq: { ...content.faq, items },
                })
              }
            />
          </EditorSection>
        );
    }
  }

  return (
    <div className={cn("space-y-6", isPending && "opacity-90")}>
      <PageHeader
        eyebrow="Website"
        title="Your wedding website"
        description={
          <>
            Edit content, preview your site, and publish when you are ready. Guests will visit{" "}
            <span className="text-ink">/w/{savedSlug || "your-link"}</span> once live.
          </>
        }
        actions={<TourHelpButton tourKey="website" />}
      />

      <Card className="space-y-5 px-6 py-5">
        <div>
          <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Choose your look
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Template personality and palette — both recolor and relayout the live preview.
          </p>
          <div className="mt-4">
            <LookStep
              template={template}
              theme={theme}
              onTemplateChange={persistTemplate}
              onThemeChange={persistTheme}
            />
          </div>
        </div>

        <div className="grid gap-4 border-t border-hairline pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="website-slug" className="mb-1.5 block text-[13px] text-muted">
              Public link
            </label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[13px] text-muted">/w/</span>
              <Input
                id="website-slug"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder="sarah-and-james"
                autoComplete="off"
              />
            </div>
            {slugError ? (
              <p className="mt-1.5 text-[13px] text-rosewood" role="alert">
                {slugError}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="default" onClick={saveSlug} disabled={isPending}>
            Save link
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <div>
            <p className="text-[14px] font-medium text-ink">
              {published ? "Published" : "Draft"}
            </p>
            <p className="text-[13px] text-muted">
              {published
                ? "Your site will be live at the public link once sharing is enabled."
                : "Only you can see the preview while unpublished."}
            </p>
          </div>
          <Button
            type="button"
            variant={published ? "default" : "primary"}
            onClick={togglePublished}
            disabled={isPending || !savedSlug}
          >
            {published ? "Unpublish" : "Publish"}
          </Button>
        </div>
        {!savedSlug ? (
          <p className="text-[13px] text-muted">Save a public link before publishing.</p>
        ) : null}
        {saveError ? (
          <p className="text-[13px] text-rosewood" role="alert">
            {saveError}
          </p>
        ) : null}

        <WebsiteRsvpShare published={published} savedSlug={savedSlug} />
      </Card>

      <div
        className={cn(
          "grid gap-8",
          isPlanner ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-1",
        )}
      >
        <div className="space-y-4">
          <EditorSection title="Hero" defaultOpen>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[13px] text-muted">Names</label>
                <Input
                  value={content.hero.names}
                  onChange={(e) => updateHero("names", e.target.value)}
                  placeholder="Sarah & James"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-muted">Date (YYYY-MM-DD)</label>
                <Input
                  type="date"
                  className="box-border min-w-0 max-w-full"
                  value={content.hero.date}
                  onChange={(e) => updateHero("date", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-muted">Tagline</label>
                <Input
                  value={content.hero.tagline}
                  onChange={(e) => updateHero("tagline", e.target.value)}
                  placeholder="Together with our families, we invite you"
                />
              </div>
              <VisibilityToggle
                checked={content.hero.showCountdown}
                onChange={(next) => updateHero("showCountdown", next)}
                label="Show countdown"
              />
              <div className="border-t border-hairline pt-3">
                <HeroImageField
                  projectId={projectId}
                  imageUrl={content.hero.imageUrl}
                  onImageUrlChange={(next) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, imageUrl: next },
                    })
                  }
                />
              </div>
            </div>
          </EditorSection>

          {sectionOrder.map((id, index) => renderReorderableSection(id, index))}

          <ExternalRegistryEditor
            projectId={projectId}
            initialLinks={externalRegistryLinks}
          />

          <EditorSection
            title="RSVP"
            visible={content.rsvp.visible}
            onVisibleChange={setRsvpVisible}
          >
            <p className="text-[13px] text-muted">
              Guests can respond from your published wedding site. Responses appear in the Guests
              tab for you to review.
            </p>
          </EditorSection>
        </div>

        <div
          data-tour="website-preview"
          className={cn(
            "min-w-0",
            isPlanner && "xl:sticky xl:top-6 xl:self-start",
          )}
        >
          <p className="mb-2 text-[13px] font-medium text-ink">Live preview</p>
          <Card className="overflow-hidden p-0">
            <div
              className={cn(
                "max-h-[min(80vh,900px)] overflow-y-auto",
                isPlanner && "xl:max-h-[calc(100vh-6rem)]",
              )}
            >
              <WeddingSiteView
                content={content}
                template={template}
                theme={theme}
                externalRegistryLinks={externalRegistryLinks}
                rsvpSlot={
                  <div
                    className="rounded-xl border px-5 py-6 text-center text-[14px]"
                    style={{
                      borderColor: "rgba(255,255,255,0.28)",
                      color: "rgba(255,255,255,0.85)",
                      background: "rgba(255,255,255,0.1)",
                    }}
                    aria-disabled
                  >
                    Your RSVP form appears here on the published site
                  </div>
                }
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
