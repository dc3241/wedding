/** Local YYYY-MM-DD — date columns only, no UTC shift. */
export function invoiceLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Invoice amounts keep cents. Budget `formatCurrency` rounds to whole dollars. */
export function formatInvoiceMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function roundInvoiceMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function invoiceTotal(amounts: number[]): number {
  return roundInvoiceMoney(amounts.reduce((sum, amount) => sum + amount, 0));
}

export function invoiceRemaining(total: number, collected: number): number {
  return roundInvoiceMoney(Math.max(0, total - collected));
}

export function parseMoney(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return roundInvoiceMoney(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return roundInvoiceMoney(parsed);
  }
  return 0;
}
