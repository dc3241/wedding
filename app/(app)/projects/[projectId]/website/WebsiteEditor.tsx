"use client";

import { useEffect, useState, useTransition } from "react";
import {
  setWeddingWebsitePublished,
  updateWeddingWebsite,
  updateWeddingWebsiteSlug,
} from "./actions";
import type { WeddingWebsiteContent, WeddingWebsiteRow } from "@/components/website/types";
import { WeddingSiteView } from "@/components/website/WeddingSiteView";
import { weddingTemplateOptions } from "@/components/website/templates/registry";
import { weddingThemeOptions } from "@/components/website/themes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import type { AccountKind } from "@/lib/account-context";

type WebsiteEditorProps = {
  projectId: string;
  website: WeddingWebsiteRow;
  accountKind: AccountKind;
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
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-stone accent-plum"
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
}: {
  title: string;
  visible?: boolean;
  onVisibleChange?: (next: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[16px] font-medium text-ink">{title}</h2>
        {onVisibleChange !== undefined && visible !== undefined ? (
          <VisibilityToggle
            checked={visible}
            onChange={onVisibleChange}
            label="Show on site"
          />
        ) : null}
      </div>
      {children}
    </Card>
  );
}

export function WebsiteEditor({ projectId, website, accountKind }: WebsiteEditorProps) {
  const [content, setContent] = useState<WeddingWebsiteContent>(website.content);
  const [template, setTemplate] = useState(website.template);
  const [theme, setTheme] = useState(website.theme);
  const [slugInput, setSlugInput] = useState(website.slug ?? "");
  const [savedSlug, setSavedSlug] = useState(website.slug);
  const [published, setPublished] = useState(website.published);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const templates = weddingTemplateOptions();
  const themes = weddingThemeOptions();
  const isPlanner = accountKind === "business";

  useEffect(() => {
    setContent(website.content);
    setTemplate(website.template);
    setTheme(website.theme);
    setSlugInput(website.slug ?? "");
    setSavedSlug(website.slug);
    setPublished(website.published);
  }, [website]);

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

  function updateTravel(body: string) {
    persistContent({ ...content, travel: { ...content.travel, body } });
  }

  function setTravelVisible(visible: boolean) {
    persistContent({ ...content, travel: { ...content.travel, visible } });
  }

  function setRegistryVisible(visible: boolean) {
    persistContent({ ...content, registry: { ...content.registry, visible } });
  }

  function setRsvpVisible(visible: boolean) {
    persistContent({ ...content, rsvp: { ...content.rsvp, visible } });
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

  function addRegistryLink() {
    persistContent({
      ...content,
      registry: {
        ...content.registry,
        links: [...content.registry.links, { label: "", url: "" }],
      },
    });
  }

  function updateRegistryLink(index: number, field: "label" | "url", value: string) {
    const links = content.registry.links.map((link, i) =>
      i === index ? { ...link, [field]: value } : link,
    );
    persistContent({ ...content, registry: { ...content.registry, links } });
  }

  function removeRegistryLink(index: number) {
    persistContent({
      ...content,
      registry: {
        ...content.registry,
        links: content.registry.links.filter((_, i) => i !== index),
      },
    });
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
      />

      <Card className="space-y-5 p-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] text-ink-muted">Template</label>
            <div className="flex flex-wrap gap-2">
              {templates.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => persistTemplate(option.key)}
                  className={cn(
                    "rounded border px-3 py-1.5 text-[13px] transition-colors",
                    template === option.key
                      ? "border-plum bg-plum-tint text-plum-deep"
                      : "border-stone bg-surface text-ink hover:border-ink-muted",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] text-ink-muted">Theme</label>
            <div className="flex flex-wrap gap-2">
              {themes.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => persistTheme(option.key)}
                  className={cn(
                    "rounded border px-3 py-1.5 text-[13px] transition-colors",
                    theme === option.key
                      ? "border-plum bg-plum-tint text-plum-deep"
                      : "border-stone bg-surface text-ink hover:border-ink-muted",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="website-slug" className="mb-1.5 block text-[13px] text-ink-muted">
              Public link
            </label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[13px] text-ink-muted">/w/</span>
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone pt-4">
          <div>
            <p className="text-[14px] font-medium text-ink">
              {published ? "Published" : "Draft"}
            </p>
            <p className="text-[13px] text-ink-muted">
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
          <p className="text-[13px] text-ink-muted">Save a public link before publishing.</p>
        ) : null}
        {saveError ? (
          <p className="text-[13px] text-rosewood" role="alert">
            {saveError}
          </p>
        ) : null}
      </Card>

      <div
        className={cn(
          "grid gap-8",
          isPlanner ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : "lg:grid-cols-1",
        )}
      >
        <div className="space-y-4">
          <EditorSection title="Hero">
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[13px] text-ink-muted">Names</label>
                <Input
                  value={content.hero.names}
                  onChange={(e) => updateHero("names", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-ink-muted">Date (YYYY-MM-DD)</label>
                <Input
                  type="date"
                  value={content.hero.date}
                  onChange={(e) => updateHero("date", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-ink-muted">Tagline</label>
                <Input
                  value={content.hero.tagline}
                  onChange={(e) => updateHero("tagline", e.target.value)}
                  placeholder="Optional welcome line"
                />
              </div>
              <VisibilityToggle
                checked={content.hero.showCountdown}
                onChange={(next) => updateHero("showCountdown", next)}
                label="Show countdown"
              />
            </div>
          </EditorSection>

          <EditorSection
            title="Our story"
            visible={content.story.visible}
            onVisibleChange={(next) => updateStory("visible", next)}
          >
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[13px] text-ink-muted">Heading</label>
                <Input
                  value={content.story.heading}
                  onChange={(e) => updateStory("heading", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] text-ink-muted">Body</label>
                <Textarea
                  rows={5}
                  value={content.story.body}
                  onChange={(e) => updateStory("body", e.target.value)}
                  placeholder="How you met, the proposal, what you are excited for…"
                />
              </div>
            </div>
          </EditorSection>

          <EditorSection
            title="Wedding details"
            visible={content.details.visible}
            onVisibleChange={(next) => updateDetails("visible", next)}
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
              <div className="space-y-3 border-t border-stone pt-4">
                <p className="text-[13px] font-medium text-ink">Reception</p>
                <Input
                  value={content.details.receptionVenue}
                  onChange={(e) => updateDetails("receptionVenue", e.target.value)}
                  placeholder="Venue name"
                />
                <Textarea
                  rows={2}
                  value={content.details.receptionAddress}
                  onChange={(e) => updateDetails("receptionAddress", e.target.value)}
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

          <EditorSection
            title="Schedule"
            visible={content.schedule.visible}
            onVisibleChange={(next) =>
              persistContent({ ...content, schedule: { ...content.schedule, visible: next } })
            }
          >
            <ul className="space-y-4">
              {content.schedule.items.map((item, index) => (
                <li key={index} className="space-y-2 rounded border border-stone p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-ink-muted">Item {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeScheduleItem(index)}
                      className="text-[13px] text-ink-muted hover:text-rosewood"
                    >
                      Remove
                    </button>
                  </div>
                  <Input
                    value={item.time}
                    onChange={(e) => updateScheduleItem(index, "time", e.target.value)}
                    placeholder="Time"
                  />
                  <Input
                    value={item.title}
                    onChange={(e) => updateScheduleItem(index, "title", e.target.value)}
                    placeholder="Title"
                  />
                  <Input
                    value={item.description}
                    onChange={(e) => updateScheduleItem(index, "description", e.target.value)}
                    placeholder="Description (optional)"
                  />
                </li>
              ))}
            </ul>
            <Button type="button" variant="default" onClick={addScheduleItem}>
              Add schedule item
            </Button>
          </EditorSection>

          <EditorSection
            title="Travel & stay"
            visible={content.travel.visible}
            onVisibleChange={setTravelVisible}
          >
            <Textarea
              rows={4}
              value={content.travel.body}
              onChange={(e) => updateTravel(e.target.value)}
              placeholder="Hotels, airports, local tips…"
            />
          </EditorSection>

          <EditorSection
            title="Registry"
            visible={content.registry.visible}
            onVisibleChange={setRegistryVisible}
          >
            <ul className="space-y-4">
              {content.registry.links.map((link, index) => (
                <li key={index} className="space-y-2 rounded border border-stone p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] text-ink-muted">Link {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeRegistryLink(index)}
                      className="text-[13px] text-ink-muted hover:text-rosewood"
                    >
                      Remove
                    </button>
                  </div>
                  <Input
                    value={link.label}
                    onChange={(e) => updateRegistryLink(index, "label", e.target.value)}
                    placeholder="Label"
                  />
                  <Input
                    value={link.url}
                    onChange={(e) => updateRegistryLink(index, "url", e.target.value)}
                    placeholder="https://"
                  />
                </li>
              ))}
            </ul>
            <Button type="button" variant="default" onClick={addRegistryLink}>
              Add registry link
            </Button>
          </EditorSection>

          <EditorSection
            title="RSVP"
            visible={content.rsvp.visible}
            onVisibleChange={setRsvpVisible}
          >
            <p className="text-[13px] text-ink-muted">
              Guests can respond from your published wedding site. Responses appear in the Guests
              tab for you to review.
            </p>
          </EditorSection>
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-[13px] font-medium text-ink">Live preview</p>
          <Card className="overflow-hidden border-stone p-0">
            <div className="max-h-[min(80vh,900px)] overflow-y-auto">
              <WeddingSiteView
                content={content}
                template={template}
                theme={theme}
                rsvpSlot={
                  <div
                    className="rounded-xl border px-5 py-6 text-center text-[14px]"
                    style={{
                      borderColor: "var(--ws-border)",
                      color: "var(--ws-muted)",
                      background: "var(--ws-surface)",
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
