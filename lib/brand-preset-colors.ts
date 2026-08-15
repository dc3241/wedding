/**
 * Curated wedding-safe accent swatches. UI sugar only — the stored value
 * is still a free-text hex on accounts.brand_accent_color. Do not persist
 * a preset id.
 */
export const BRAND_PRESET_COLORS = [
  { hex: "#C0396B", label: "Berry" },
  { hex: "#A13F5C", label: "Dusty rose" },
  { hex: "#8B3A4A", label: "Wine" },
  { hex: "#5C4B7A", label: "Plum" },
  { hex: "#3D5A80", label: "Slate" },
  { hex: "#1F3A4C", label: "Navy" },
  { hex: "#6B4F3A", label: "Taupe" },
  { hex: "#2C5F4A", label: "Forest" },
] as const;
