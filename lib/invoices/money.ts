/** Invoice amounts keep cents. Budget `formatCurrency` rounds to whole dollars. */
export function formatInvoiceMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function invoiceTotal(amounts: number[]): number {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}

export function parseMoney(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}
