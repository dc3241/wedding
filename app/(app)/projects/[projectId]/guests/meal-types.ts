export type MealServiceStyle =
  | "none"
  | "plated"
  | "buffet"
  | "family_style"
  | "stations";

export type MealOption = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  is_kids: boolean;
  sort_order: number;
  created_at: string;
};

/** Selectable service styles in Catering / Meals. `none` is omitted; preserved only when already stored. */
export const MEAL_SERVICE_STYLES: {
  value: Exclude<MealServiceStyle, "none">;
  label: string;
}[] = [
  { value: "plated", label: "Plated" },
  { value: "buffet", label: "Buffet" },
  { value: "family_style", label: "Family style" },
  { value: "stations", label: "Stations" },
];

export const MEAL_SERVICE_STYLE_VALUES: MealServiceStyle[] = [
  "none",
  "plated",
  "buffet",
  "family_style",
  "stations",
];

export function isMealServiceStyle(value: string): value is MealServiceStyle {
  return (MEAL_SERVICE_STYLE_VALUES as string[]).includes(value);
}
