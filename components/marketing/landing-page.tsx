import { AudienceSplit } from "./audience-split";
import { CapabilitiesPanel } from "./capabilities-panel";
import { FeatureGrid } from "./feature-grid";
import { FinalCta } from "./final-cta";
import { HowItWorks } from "./how-it-works";
import { LandingHero } from "./landing-hero";
import { MarketingFooter } from "./marketing-footer";
import { MarketingTopbar } from "./marketing-topbar";

export function LandingPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main>
        <LandingHero />
        <CapabilitiesPanel />
        <AudienceSplit />
        <FeatureGrid />
        <HowItWorks />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
