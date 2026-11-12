import type { Metadata } from "next";
import { CategoryStatePage, categoryStateMetadata } from "@/components/directory/category-state-page";
import { DIRECTORY_STATES } from "@/lib/directory/states";

export const revalidate = 3600;

export function generateStaticParams() {
  return DIRECTORY_STATES.map((s) => ({ state: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }): Promise<Metadata> {
  return categoryStateMetadata("florists", (await params).state);
}

export default async function Page({ params }: { params: Promise<{ state: string }> }) {
  return <CategoryStatePage categoryPath="florists" stateSlug={(await params).state} />;
}
