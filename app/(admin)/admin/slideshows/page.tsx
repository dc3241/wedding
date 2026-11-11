import { notFound } from "next/navigation";
import { SlideshowStudio } from "@/components/admin/slideshows/slideshow-studio";
import { PageHeader } from "@/components/ui/page-header";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { getSlideshowPageData } from "@/lib/admin/slideshows/queries";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSlideshowsPage() {
  const supabase = await createClient();
  if (!(await checkIsAdmin(supabase))) notFound();
  const data = await getSlideshowPageData(supabase);
  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Slideshows"
        description="A fresh batch every week: tips and engagement posts. Download the ones you like, log how they did, and the next batch learns from it."
      />
      <SlideshowStudio {...data} />
    </div>
  );
}
