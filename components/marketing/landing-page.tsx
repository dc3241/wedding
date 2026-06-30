import { AudienceSplit } from "./audience-split";
import { FeatureGrid } from "./feature-grid";
import { FinalCta } from "./final-cta";
import { HowItWorks } from "./how-it-works";
import { LandingHero } from "./landing-hero";
import { MarketingFooter } from "./marketing-footer";
import { MarketingTopbar } from "./marketing-topbar";
import { ProductPreview } from "./product-preview";

export function LandingPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main>
        <LandingHero />
        <ProductPreview />
        <AudienceSplit />
        <FeatureGrid />
        <HowItWorks />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
