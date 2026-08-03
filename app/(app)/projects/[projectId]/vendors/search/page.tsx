import { redirect } from "next/navigation";

/** Stale-link safe: search consolidated onto the Vendors tab (VND-09). */
export default async function VendorSearchPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/vendors`);
}
