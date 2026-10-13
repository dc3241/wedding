import { Select } from "@/components/ui/select";
import {
  LEAD_SOURCES,
  canonicalLeadSource,
} from "./lead-source";

export function LeadSourceSelect({
  id,
  name,
  current,
  disabled,
  mode,
}: {
  id: string;
  name: string;
  current?: string | null;
  disabled?: boolean;
  mode: "create" | "edit";
}) {
  const raw = current?.trim() ?? "";
  const canonical = canonicalLeadSource(raw);
  const unknown = mode === "edit" && Boolean(raw) && !canonical;
  const options = LEAD_SOURCES.filter((option) => {
    if (option.manual) return true;
    return mode === "edit" && canonical === option.value;
  });

  return (
    <Select
      id={id}
      name={name}
      defaultValue={unknown ? raw : (canonical ?? "")}
      disabled={disabled}
    >
      <option value="">None</option>
      {unknown ? <option value={raw}>{raw}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
