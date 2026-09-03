import { MediaLibrary } from "@/components/admin/media-library";
import { getMediaAssets } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export default async function AdminMediaPage() {
  const supabase = await createClient();
  const assets = await getMediaAssets(supabase);

  return (
    <div>
      <h1 className="font-display text-[26px] font-extrabold tracking-[-0.01em] text-ink">
        Media library
      </h1>
      <p className="mb-5 text-[13.5px] text-muted">
        UGC handoff — Jordyn uploads raw video/photos here, Dom downloads for editing. Files are
        private and never public.
      </p>

      <MediaLibrary assets={assets} />
    </div>
  );
}
