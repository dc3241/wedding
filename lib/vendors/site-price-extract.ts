export type VendorSitePackage = {
  name: string;
  amount: number;
};

export type VendorSitePrice = {
  startingAmount: number | null;
  perPerson: boolean;
  packages: VendorSitePackage[];
};

const MONEY =
  String.raw`\$\s*(\d{1,3}(?:,\d{3})+|\d{2,6})(?:\.\d{2})?`;

const STARTING = new RegExp(
  String.raw`(?:starting(?:\s+price)?(?:\s+at)?|starts(?:\s+at)?|start(?:\s+at)|priced?\s+from|packages?\s+from|as\s+low\s+as|(?:^|[\s.,;])from)\s*${MONEY}`,
  "gi",
);

const NAMED_PACKAGE = new RegExp(
  String.raw`([A-Z][A-Za-z0-9][A-Za-z0-9 &/'’-]{1,42}?)\s+package\s*[:\-–—]?\s*${MONEY}`,
  "g",
);

const PER_PERSON =
  /per\s+(?:person|guest|head|plate)|\/\s*person|\bpp\b/i;

const DEPOSIT =
  /^\s*(?:non-?refundable\s+)?(?:deposit|retainer|booking fee|to reserve)/i;

const NAME_STOP = new Set([
  "a",
  "an",
  "the",
  "our",
  "this",
  "your",
  "wedding",
  "package",
  "packages",
]);

function parseMoney(raw: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 20 || n > 500_000) return null;
  return Math.round(n);
}

function tail(text: string, end: number): string {
  return text.slice(end, end + 32);
}

function isPerPerson(text: string, end: number): boolean {
  return PER_PERSON.test(tail(text, end));
}

function isDeposit(text: string, end: number): boolean {
  return DEPOSIT.test(tail(text, end));
}

function cleanPackageName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 3 || name.length > 40) return null;
  const words = name.toLowerCase().split(" ");
  if (words.every((word) => NAME_STOP.has(word))) return "Package";
  return name;
}

/**
 * Pull a starting price and named packages only from amounts the page states.
 * Unlabeled dollar figures are ignored. Caterer pages may keep per-person rates;
 * other categories skip them so a meal price is not shown as the vendor fee.
 */
export function extractSitePrice(
  text: string,
  categoryId: string,
): VendorSitePrice | null {
  const skipPerPerson = categoryId !== "caterer";
  const starting: { amount: number; perPerson: boolean }[] = [];

  for (const match of text.matchAll(STARTING)) {
    const amount = parseMoney(match[1] ?? "");
    if (amount == null) continue;
    const end = match.index! + match[0].length;
    if (isDeposit(text, end)) continue;
    const perPerson = isPerPerson(text, end);
    if (skipPerPerson && perPerson) continue;
    starting.push({ amount, perPerson });
  }

  const packages: VendorSitePackage[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(NAMED_PACKAGE)) {
    const name = cleanPackageName(match[1] ?? "");
    const amount = parseMoney(match[2] ?? "");
    if (!name || amount == null) continue;
    const end = match.index! + match[0].length;
    if (isDeposit(text, end)) continue;
    if (skipPerPerson && isPerPerson(text, end)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    packages.push({ name, amount });
    if (packages.length >= 3) break;
  }

  if (starting.length === 0 && packages.length === 0) return null;

  starting.sort((a, b) => a.amount - b.amount);
  const floor = starting[0];
  const packageFloor =
    packages.length > 0
      ? Math.min(...packages.map((item) => item.amount))
      : null;

  return {
    startingAmount: floor?.amount ?? packageFloor,
    perPerson: floor?.perPerson ?? false,
    packages,
  };
}
