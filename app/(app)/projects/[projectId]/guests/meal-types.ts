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

export const MEAL_SERVICE_STYLES: {
  value: MealServiceStyle;
  label: string;
}[] = [
  { value: "none", label: "No meal selection" },
  { value: "plated", label: "Plated" },
  { value: "buffet", label: "Buffet" },
  { value: "family_style", label: "Family style" },
  { value: "stations", label: "Stations" },
];

export const MEAL_SERVICE_STYLE_VALUES: MealServiceStyle[] =
  MEAL_SERVICE_STYLES.map((s) => s.value);

export function isMealServiceStyle(value: string): value is MealServiceStyle {
  return (MEAL_SERVICE_STYLE_VALUES as string[]).includes(value);
}
