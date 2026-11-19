import { FeaturedManager } from "@/components/admin/featured-manager";
import { PageHeader } from "@/components/ui/page-header";
import { searchListings, type AdminListing } from "./actions";

export default async function AdminFeaturedPage() {
  let initial: AdminListing[] = [];
  let loadError: string | null = null;
  try {
    initial = await searchListings("");
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Couldn't load listings.";
  }

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Featured listings"
        description="Paid spots in the labeled Featured row on a state's directory page (up to 3 per page). The main list's order never changes."
      />
      {loadError ? (
        <p className="mb-4 rounded-[var(--radius-inner)] bg-rosewood-wash px-4 py-3 text-[14px] text-rosewood">
          {loadError} Has the partners migration been pasted?
        </p>
      ) : null}
      <FeaturedManager initialRows={initial} />
    </div>
  );
}
