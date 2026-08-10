import { cn } from "@/lib/cn";

export function GoogleMapsAttribution({ className }: { className?: string }) {
  return (
    <p
      // Raw hex + Roboto are deliberate: Google Maps attribution styling.
      // Do NOT replace with a Soft stack token — brand-tinting third-party
      // attribution is out of spec. See .cursor/design.mdc Still-open (DECIDED).
      className={cn("text-xs text-[#5E5E5E]", className)}
      style={{ fontFamily: "Roboto, sans-serif", fontWeight: 400 }}
    >
      <span translate="no">Google Maps</span>
    </p>
  );
}
