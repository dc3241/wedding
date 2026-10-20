import { ForPlannersPage } from "@/components/marketing/for-planners-page";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Planner CRM",
  description:
    "A wedding planner CRM that goes from lead to payment to the couple's workbook. Capture inquiries, send proposals, collect payment, then plan the wedding in one platform.",
  path: "/for-planners",
});

export default async function ForPlannersRoute({
  searchParams,
}: {
  searchParams: Promise<{ demo_error?: string }>;
}) {
  const { demo_error: demoError } = await searchParams;
  return <ForPlannersPage demoError={demoError} />;
}
