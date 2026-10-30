import { IdeationStudio } from "@/components/admin/ideation-studio";
import { PageHeader } from "@/components/ui/page-header";
import { getLatestIdeaBatch, getReviewPosts } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export default async function AdminIdeationPage() {
  const supabase = await createClient();
  const [items, ideas] = await Promise.all([
    getReviewPosts(supabase),
    getLatestIdeaBatch(supabase),
  ]);

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Ideation"
        description="Tell it what's working, get 10 ideas, pick a few to create. Approve a post to download it."
      />
      <IdeationStudio items={items} ideas={ideas} />
    </div>
  );
}
