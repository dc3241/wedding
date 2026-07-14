const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseWeddingDate(
  value: string | null,
): { ok: true; date: string | null } | { ok: false; error: string } {
  if (value === null) {
    return { ok: true, date: null };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a valid date." };
  }

  if (!ISO_DATE.test(trimmed)) {
    return { ok: false, error: "Enter a valid date." };
  }

  const parsed = new Date(trimmed + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Enter a valid date." };
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  if (`${year}-${month}-${day}` !== trimmed) {
    return { ok: false, error: "Enter a valid date." };
  }

  return { ok: true, date: trimmed };
}
