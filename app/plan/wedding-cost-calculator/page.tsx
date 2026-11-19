import { JsonLd } from "@/components/marketing/json-ld";
import { ToolPage } from "@/components/plan/tool-page";
import { WeddingCostCalculator } from "@/components/plan/wedding-cost-calculator";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Cost Calculator",
  description:
    "Free wedding cost calculator: estimate your total from your guest count and style, and see how the budget splits across venue, catering, photography and more.",
  path: "/plan/wedding-cost-calculator",
});

export default function WeddingCostCalculatorPage() {
  return (
    <ToolPage
      eyebrow="Wedding cost calculator"
      title="How much will our wedding cost?"
      intro="Move the guest count, pick a style, and get a starting range plus a typical split across vendors. Have a budget already? Add it to see what it buys per guest."
      source="tool:cost"
      appPitch="Turn this split into a budget you can track, with estimates, actuals and payment due dates for every vendor."
      currentHref="/plan/wedding-cost-calculator"
    >
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Planning tools", path: "/plan" },
          { name: "Wedding cost calculator", path: "/plan/wedding-cost-calculator" },
        ])}
      />
      <WeddingCostCalculator />
    </ToolPage>
  );
}
