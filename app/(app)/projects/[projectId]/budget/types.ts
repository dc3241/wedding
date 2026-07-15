export type BudgetItem = {
  id: string;
  category: string | null;
  label: string;
  planned_amount: number;
  actual_amount: number | null;
  notes: string | null;
  project_vendor_id: string | null;
};

export type BookedVendorCost = {
  id: string;
  quoted_price: number;
  vendor: {
    name: string;
    category: string | null;
  };
};

export function sumPlanned(items: BudgetItem[]) {
  return items.reduce((sum, item) => sum + item.planned_amount, 0);
}

export function sumVendorCosts(vendors: BookedVendorCost[]) {
  return vendors.reduce((sum, row) => sum + row.quoted_price, 0);
}
