export type PlanChecklistItem = {
  title: string;
  phase: string;
  dueDate: string | null;
};

export type PlanBudgetItem = {
  category: string;
  plannedAmount: number;
};

export type PlanVendorCategory = {
  category: string;
  note: string;
};

export type WeddingPlan = {
  checklist: PlanChecklistItem[];
  budget: PlanBudgetItem[];
  vendorCategories: PlanVendorCategory[];
};

export type GeneratePlanResult =
  | { ok: true; plan: WeddingPlan; totalBudgetTarget: number | null }
  | { ok: false; error: string };
