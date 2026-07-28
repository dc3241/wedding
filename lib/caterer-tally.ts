export type CatererMealTally = {
  meal_option_id: string | null;
  label: string;
  count: number;
};

type TallyInput = {
  attending: boolean;
  meal_option_id: string | null;
  meal_name?: string | null;
};

/**
 * Project-wide caterer tally: attending guest_members grouped by meal_option_id.
 * Null meal → "No selection". Read-time only — no stored counter.
 */
export function tallyAttendingMeals(
  members: TallyInput[],
  optionNames?: Map<string, string>,
): CatererMealTally[] {
  const map = new Map<string, CatererMealTally>();

  for (const member of members) {
    if (!member.attending) continue;

    const key = member.meal_option_id ?? "__none__";
    const label = member.meal_option_id
      ? (member.meal_name?.trim() ||
          optionNames?.get(member.meal_option_id) ||
          "Meal")
      : "No selection";

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        meal_option_id: member.meal_option_id,
        label,
        count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.meal_option_id === null && b.meal_option_id !== null) return 1;
    if (a.meal_option_id !== null && b.meal_option_id === null) return -1;
    return b.count - a.count || a.label.localeCompare(b.label);
  });
}
