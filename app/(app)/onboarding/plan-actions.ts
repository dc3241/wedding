"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GeneratePlanResult, WeddingPlan } from "./plan-types";
import { phaseFromMonthsBefore } from "@/lib/checklist-phases";
import { wholeMonthsBetween } from "@/lib/date-months";
import {
  callClaudeForWeddingPlan,
  dueDateFromMonthsBefore,
  type RawGeneratedPlan,
} from "@/lib/generate-wedding-plan";
import { getVendorCategoryById } from "@/lib/vendor-categories";
import { createClient } from "@/utils/supabase/server";

function projectPath(projectId: string) {
  return `/projects/${projectId}`;
}

function todayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toWeddingPlan(
  raw: RawGeneratedPlan,
  weddingDate: string | null,
  todayIso: string,
): WeddingPlan {
  const runwayMonths =
    weddingDate !== null
      ? Math.max(0, wholeMonthsBetween(todayIso, weddingDate))
      : null;

  return {
    checklist: raw.checklist.map((item) => {
      if (weddingDate === null || runwayMonths === null) {
        return {
          title: item.title,
          phase: phaseFromMonthsBefore(item.monthsBeforeWedding),
          dueDate: null,
        };
      }

      const effective = Math.max(
        0,
        Math.min(item.monthsBeforeWedding, runwayMonths),
      );

      return {
        title: item.title,
        phase: phaseFromMonthsBefore(effective),
        dueDate: dueDateFromMonthsBefore(weddingDate, effective),
      };
    }),
    budget: raw.budget.map((item) => ({
      category: item.category,
      plannedAmount: item.plannedAmount,
    })),
    vendorCategories: raw.vendorCategories.map((item) => ({
      category: item.category,
      note: item.note,
    })),
  };
}

export async function generatePlan(
  projectId: string,
): Promise<GeneratePlanResult> {
  const supabase = await createClient();

  const [{ data: project }, { data: profile }] = await Promise.all([
    supabase
      .from("projects")
      .select("name, wedding_date, total_budget")
      .eq("id", projectId)
      .single(),
    supabase
      .from("wedding_profile")
      .select(
        "location, guest_estimate, style, traditions, priorities, vibe_notes",
      )
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  if (!project) {
    return { ok: false, error: "We couldn't find your wedding project." };
  }

  const totalBudgetTarget =
    project.total_budget === null || project.total_budget === undefined
      ? null
      : Number(project.total_budget);

  const todayIso = todayIsoDate();
  const runwayMonths =
    project.wedding_date !== null
      ? Math.max(0, wholeMonthsBetween(todayIso, project.wedding_date))
      : null;

  const raw = await callClaudeForWeddingPlan(
    {
      projectName: project.name,
      weddingDate: project.wedding_date,
      totalBudget: totalBudgetTarget,
      location: profile?.location ?? null,
      guestEstimate: profile?.guest_estimate ?? null,
      style: profile?.style ?? null,
      traditions: profile?.traditions ?? null,
      priorities: profile?.priorities ?? null,
      vibeNotes: profile?.vibe_notes ?? null,
    },
    todayIso,
    runwayMonths,
  );

  if (!raw) {
    return {
      ok: false,
      error:
        "We couldn't generate your plan right now. Please try again in a moment.",
    };
  }

  return {
    ok: true,
    plan: toWeddingPlan(raw, project.wedding_date, todayIso),
    totalBudgetTarget,
  };
}

export async function commitPlan(projectId: string, approvedPlan: WeddingPlan) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (count && count > 0) {
    redirect(projectPath(projectId));
  }

  const phasePositions = new Map<string, number>();

  const taskRows = approvedPlan.checklist
    .map((item) => {
      const title = item.title.trim();
      if (!title) return null;

      const phase = item.phase.trim() || null;
      const position = phasePositions.get(phase ?? "") ?? 0;
      phasePositions.set(phase ?? "", position + 1);

      return {
        project_id: projectId,
        title,
        phase,
        due_date: item.dueDate,
        position,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const budgetRows = approvedPlan.budget
    .map((item) => {
      const category = item.category.trim();
      if (!category) return null;

      return {
        project_id: projectId,
        category,
        label: category,
        planned_amount: Math.max(0, item.plannedAmount || 0),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const vendorRows: {
    project_id: string;
    category: string;
    note: string | null;
    status: "needed";
  }[] = [];
  const seenVendorCategories = new Set<string>();

  for (const item of approvedPlan.vendorCategories) {
    const categoryId = item.category.trim();
    if (!getVendorCategoryById(categoryId)) {
      console.log(
        "[commitPlan] rejecting non-canonical vendor category",
        categoryId,
      );
      continue;
    }
    if (seenVendorCategories.has(categoryId)) {
      continue;
    }
    seenVendorCategories.add(categoryId);
    vendorRows.push({
      project_id: projectId,
      category: categoryId,
      note: item.note.trim() || null,
      status: "needed",
    });
  }

  if (taskRows.length > 0) {
    const { error } = await supabase.from("tasks").insert(taskRows);
    if (error) throw error;
  }

  if (budgetRows.length > 0) {
    const { error } = await supabase.from("budget_items").insert(budgetRows);
    if (error) throw error;
  }

  if (vendorRows.length > 0) {
    const { error } = await supabase.from("vendor_targets").insert(vendorRows);
    if (error) throw error;
  }

  const { error: profileError } = await supabase
    .from("wedding_profile")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("project_id", projectId);

  if (profileError) throw profileError;

  revalidatePath("/onboarding");
  revalidatePath(projectPath(projectId));
  revalidatePath(`${projectPath(projectId)}/checklist`);
  revalidatePath(`${projectPath(projectId)}/budget`);
  revalidatePath(`${projectPath(projectId)}/vendors`);

  redirect(projectPath(projectId));
}
