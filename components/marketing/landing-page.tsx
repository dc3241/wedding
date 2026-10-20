import { AudienceSection } from "./audience-section";
import { CapabilitiesPanel } from "./capabilities-panel";
import { FinalCta } from "./final-cta";
import { JsonLd } from "./json-ld";
import { LandingHero } from "./landing-hero";
import { MarketingFooter } from "./marketing-footer";
import { MarketingTopbar } from "./marketing-topbar";
import {
  organizationJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/seo";

const APP_DESCRIPTION =
  "First Look is a wedding planning CRM for planners and venues: lead, payment, and the wedding workbook in one platform.";

export function LandingPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={softwareApplicationJsonLd(APP_DESCRIPTION)} />
      <MarketingTopbar />
      <main>
        <LandingHero />
        <AudienceSection />
        <CapabilitiesPanel />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
