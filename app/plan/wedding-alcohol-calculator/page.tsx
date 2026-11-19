import { JsonLd } from "@/components/marketing/json-ld";
import { AlcoholCalculator } from "@/components/plan/alcohol-calculator";
import { ToolPage } from "@/components/plan/tool-page";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Alcohol Calculator",
  description:
    "Free wedding alcohol calculator: how many bottles of wine, beer, liquor and champagne to buy for your guest count and reception length.",
  path: "/plan/wedding-alcohol-calculator",
});

export default function AlcoholCalculatorPage() {
  return (
    <ToolPage
      eyebrow="Alcohol calculator"
      title="How much alcohol do we need for our wedding?"
      intro="Tell us how many guests drink, how long the bar is open, and what you're pouring. We'll give you a shopping list in bottles and cases."
      source="tool:alcohol"
      appPitch="Add the bar to your budget, track what you've paid, and keep your guest count in sync with RSVPs."
      currentHref="/plan/wedding-alcohol-calculator"
    >
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Planning tools", path: "/plan" },
          { name: "Wedding alcohol calculator", path: "/plan/wedding-alcohol-calculator" },
        ])}
      />
      <AlcoholCalculator />
    </ToolPage>
  );
}
