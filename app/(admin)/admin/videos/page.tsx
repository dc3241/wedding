import { notFound } from "next/navigation";
import { VideoStudio } from "@/components/admin/videos/video-studio";
import { PageHeader } from "@/components/ui/page-header";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { getVideoPageData } from "@/lib/admin/videos/queries";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const supabase = await createClient();
  if (!(await checkIsAdmin(supabase))) notFound();
  const data = await getVideoPageData(supabase);
  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Videos"
        description="Ten ideas, pick the ones you like, edit the script, add the voiceover and screen recordings, then generate. Download the video and caption together."
      />
      <VideoStudio {...data} />
    </div>
  );
}
