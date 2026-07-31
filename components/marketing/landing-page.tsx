import { AudienceSection } from "./audience-section";
import { CapabilitiesPanel } from "./capabilities-panel";
import { FeatureGrid } from "./feature-grid";
import { FinalCta } from "./final-cta";
import { LandingHero } from "./landing-hero";
import { MarketingFooter } from "./marketing-footer";
import { MarketingTopbar } from "./marketing-topbar";

export function LandingPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main>
        <LandingHero />
        <AudienceSection />
        <CapabilitiesPanel />
        <FeatureGrid />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
