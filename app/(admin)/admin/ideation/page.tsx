import { IdeationStudio } from "@/components/admin/ideation-studio";
import { PostedResults } from "@/components/admin/posted-results";
import { PageHeader } from "@/components/ui/page-header";
import { getLatestIdeaBatch, getPostedPosts, getReviewPosts } from "@/lib/admin/queries";
import { createClient } from "@/utils/supabase/server";

export default async function AdminIdeationPage() {
  const supabase = await createClient();
  const [items, ideas, posted] = await Promise.all([
    getReviewPosts(supabase),
    getLatestIdeaBatch(supabase),
    getPostedPosts(supabase),
  ]);

  return (
    <div>
      <PageHeader
        className="mb-5"
        title="Ideation"
        description="Tell it what's working, get 10 ideas, pick a few to create. Approve a post to download it, then log how it did."
      />
      <IdeationStudio items={items} ideas={ideas} />
      <PostedResults posts={posted} />
    </div>
  );
}
