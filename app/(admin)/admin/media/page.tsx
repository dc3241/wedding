import { MediaLibrary } from "@/components/admin/media-library";
import { PageHeader } from "@/components/ui/page-header";
import { getMediaAssets } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export default async function AdminMediaPage() {
  const supabase = await createClient();
  const assets = await getMediaAssets(supabase);

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Media library"
        description="UGC handoff — Jordyn uploads raw video/photos here, Dom downloads for editing. Files are private and never public."
      />

      <MediaLibrary assets={assets} />
    </div>
  );
}
