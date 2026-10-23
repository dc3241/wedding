import { IdeationStudio } from "@/components/admin/ideation-studio";
import { PageHeader } from "@/components/ui/page-header";
import { getReviewPosts } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export default async function AdminIdeationPage() {
  const supabase = await createClient();
  const items = await getReviewPosts(supabase);

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Ideation"
        description="Pick a platform, angle, and post type. Generate the caption and image, then approve to the content bank."
      />
      <IdeationStudio items={items} />
    </div>
  );
}
