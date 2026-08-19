import { redirect } from "next/navigation";
import { BrandingForm } from "@/app/(app)/account/branding/BrandingForm";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import { shellLayoutClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

export default async function BrandingPage() {
  const supabase = await createClient();
  const account = await getAccountContext(supabase);

  if (!account || account.kind !== "business") {
    redirect("/account/billing");
  }

  const accountId = await resolveBusinessAccountId(supabase);

  const { data: row } = await supabase
    .from("accounts")
    .select(
      "plan, brand_name, brand_logo_url, brand_accent_color, white_label_enabled",
    )
    .eq("id", accountId)
    .maybeSingle();

  const shellClass = shellLayoutClass(account.kind, false, "reading");
  const isVenue = row?.plan === "venue";
  const description = isVenue
    ? "Show your logo, name, and accent color across your planner dashboard, to invited couples, and on the public inquiry embed."
    : "Show invited couples and collaborators your logo, name, and accent color inside the app and on the public inquiry embed. Your planner chrome stays First Look.";

  return (
    <div className={shellClass}>
      <PageHeader
        eyebrow="Account"
        title="Branding"
        description={description}
      />
      <BrandingForm
        accountId={accountId}
        initial={{
          brandName: row?.brand_name ?? null,
          brandLogoUrl: row?.brand_logo_url ?? null,
          brandAccentColor: row?.brand_accent_color ?? null,
          whiteLabelEnabled: row?.white_label_enabled === true,
        }}
      />
    </div>
  );
}
