export type VendorMarketContext = {
  categoryLabel: string;
  /** Median saved quote for this category. Null until enough non-demo quotes exist. */
  medianQuote: number | null;
  quoteCount: number;
  /** This project's planned budget lines that map to the category. */
  yourBudget: number | null;
};
