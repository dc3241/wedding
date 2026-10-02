"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import {
  formatDayHeading,
  isContentLane,
  linkedInIntent,
  postingDates,
  slotLabel,
  slotsForLane,
} from "@/lib/admin/content-week";
import { ensureWeekSlots } from "@/lib/admin/content-week/load";
import { createClient } from "@/utils/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) throw new Error("Not authorized");
  return supabase;
}

function revalidate() {
  revalidatePath("/admin/ideation");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin");
}

export async function chooseWeekIdea(id: string) {
  const supabase = await requireAdmin();
  const { data: idea, error } = await supabase
    .from("ideation_items")
    .select("id, lane, intent, slot_date, week_start, rating, used_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!idea) throw new Error("Idea not found.");
  if (!isContentLane(idea.lane) || !idea.slot_date || !idea.week_start) {
    throw new Error("This idea is not on the week board.");
  }
  if (idea.used_at) throw new Error("This idea was already produced.");

  const { data: existing, error: existingError } = await supabase
    .from("content_slots")
    .select("id, posted_at")
    .eq("idea_id", id)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (idea.rating === "up" && existing) {
    if (existing.posted_at) {
      throw new Error("Uncheck posted on the schedule before removing this from the day.");
    }
    const { error: clearError } = await supabase
      .from("content_slots")
      .update({ idea_id: null, filmed_at: null, fb_posted_at: null })
      .eq("id", existing.id);
    if (clearError) throw new Error(clearError.message);
    const { error: rateError } = await supabase
      .from("ideation_items")
      .update({ rating: null })
      .eq("id", id);
    if (rateError) throw new Error(rateError.message);
    revalidate();
    return;
  }

  await ensureWeekSlots(supabase, idea.week_start);
  const { data: daySlots, error: slotsError } = await supabase
    .from("content_slots")
    .select("id, lane, intent, position, idea_id")
    .eq("slot_date", idea.slot_date)
    .eq("lane", idea.lane)
    .order("position", { ascending: true });
  if (slotsError) throw new Error(slotsError.message);

  const open = (daySlots ?? []).filter((slot) => {
    if (slot.idea_id) return false;
    if (idea.lane === "video") return true;
    return slot.intent === idea.intent;
  });
  const target = open[0];
  if (!target) {
    const day = formatDayHeading(idea.slot_date);
    const message =
      idea.lane === "video"
        ? `${day} already has 2 videos.`
        : idea.lane === "linkedin"
          ? `${day} already has its LinkedIn post.`
          : idea.lane === "pin"
            ? `${day} already has ${idea.intent === "promo" ? "its promo pin" : "2 tip pins"}.`
            : `${day} already has its ${idea.intent} slideshow.`;
    throw new Error(`${message} Uncheck one first.`);
  }

  const { error: claimError } = await supabase
    .from("content_slots")
    .update({ idea_id: id })
    .eq("id", target.id)
    .is("idea_id", null);
  if (claimError) throw new Error(claimError.message);
  const { error: rateError } = await supabase
    .from("ideation_items")
    .update({ rating: "up" })
    .eq("id", id);
  if (rateError) throw new Error(rateError.message);
  revalidate();
}

export async function passWeekIdea(id: string) {
  const supabase = await requireAdmin();
  const { error: clearError } = await supabase
    .from("content_slots")
    .update({ idea_id: null, filmed_at: null, fb_posted_at: null })
    .eq("idea_id", id)
    .is("posted_at", null);
  if (clearError) throw new Error(clearError.message);
  const { error } = await supabase.from("ideation_items").update({ rating: "down" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function moveSlotToDay(slotId: string, targetDate: string) {
  const supabase = await requireAdmin();
  const { data: source, error } = await supabase
    .from("content_slots")
    .select("id, week_start, slot_date, lane, intent, idea_id")
    .eq("id", slotId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!source || !isContentLane(source.lane)) throw new Error("That slot is empty.");
  if (source.lane === "video") throw new Error("A video stays on its day.");
  if (!source.idea_id) throw new Error("That slot is empty.");
  if (!postingDates(source.week_start).includes(targetDate)) {
    throw new Error("Pick a Monday–Saturday in this week.");
  }
  if (targetDate === source.slot_date) return;

  if (source.lane === "linkedin" && linkedInIntent(targetDate) !== source.intent) {
    const next = linkedInIntent(targetDate);
    throw new Error(
      `${formatDayHeading(targetDate)} is a LinkedIn ${next}. This post is a ${source.intent}.`,
    );
  }

  const { data: targets, error: targetError } = await supabase
    .from("content_slots")
    .select("id, intent, idea_id, position")
    .eq("slot_date", targetDate)
    .eq("lane", source.lane)
    .order("position", { ascending: true });
  if (targetError) throw new Error(targetError.message);

  const dest = (targets ?? []).find((slot) => {
    if (slot.idea_id) return false;
    if (source.lane === "video") return true;
    return slot.intent === source.intent;
  });
  if (!dest) {
    const spec = slotsForLane(source.lane, targetDate)[0];
    throw new Error(
      `${formatDayHeading(targetDate)} has no open ${slotLabel(source.lane, spec?.position ?? 1, source.intent)} slot.`,
    );
  }

  const { error: clearError } = await supabase
    .from("content_slots")
    .update({ idea_id: null, filmed_at: null, posted_at: null, fb_posted_at: null })
    .eq("id", source.id);
  if (clearError) throw new Error(clearError.message);

  const { error: claimError } = await supabase
    .from("content_slots")
    .update({ idea_id: source.idea_id })
    .eq("id", dest.id)
    .is("idea_id", null);
  if (claimError) throw new Error(claimError.message);

  const { error: ideaError } = await supabase
    .from("ideation_items")
    .update({ slot_date: targetDate })
    .eq("id", source.idea_id);
  if (ideaError) throw new Error(ideaError.message);
  revalidate();
}

export async function setSlotCheck(
  slotId: string,
  field: "filmed" | "posted" | "facebook",
  on: boolean,
) {
  const supabase = await requireAdmin();
  const { data: slot, error } = await supabase
    .from("content_slots")
    .select("id, lane, idea_id")
    .eq("id", slotId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!slot) throw new Error("Slot not found.");
  if (!isContentLane(slot.lane)) throw new Error("Slot not found.");
  if (field === "filmed" && slot.lane !== "video") return;
  if (field === "facebook" && slot.lane !== "video" && slot.lane !== "pin") return;
  if (on && slot.lane !== "video" && !slot.idea_id) {
    throw new Error("Choose an idea for this slot first.");
  }

  const column = field === "filmed" ? "filmed_at" : field === "posted" ? "posted_at" : "fb_posted_at";
  const { error: updateError } = await supabase
    .from("content_slots")
    .update({ [column]: on ? new Date().toISOString() : null })
    .eq("id", slotId);
  if (updateError) throw new Error(updateError.message);
  revalidate();
}
