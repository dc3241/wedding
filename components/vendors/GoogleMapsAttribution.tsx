import { cn } from "@/lib/cn";

export function GoogleMapsAttribution({ className }: { className?: string }) {
  return (
    <p
      className={cn("text-xs text-[#5E5E5E]", className)}
      style={{ fontFamily: "Roboto, sans-serif", fontWeight: 400 }}
    >
      <span translate="no">Google Maps</span>
    </p>
  );
}
