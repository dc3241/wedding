"use client";

import { useTransition } from "react";
import { addVendor } from "@/app/(app)/projects/[projectId]/vendors/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";

export function AddVendorForm({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = (form.get("name") as string) ?? "";
    const category = (form.get("category") as string) ?? "";
    const contactEmail = (form.get("contact_email") as string) ?? "";

    if (!name.trim()) return;

    startTransition(async () => {
      await addVendor(projectId, name, category, contactEmail);
      e.currentTarget.reset();
    });
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Eyebrow>Add manually</Eyebrow>
          <h2 className="mt-1 text-[20px] font-medium text-ink">Add vendor</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="vendor-name" className="text-sm font-medium text-ink">
              Name
            </label>
            <Input
              id="vendor-name"
              name="name"
              type="text"
              required
              placeholder="Vendor name"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="vendor-category"
              className="text-sm font-medium text-ink"
            >
              Category
            </label>
            <Input
              id="vendor-category"
              name="category"
              type="text"
              placeholder="e.g. florist"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="vendor-email"
              className="text-sm font-medium text-ink"
            >
              Contact email
            </label>
            <Input
              id="vendor-email"
              name="contact_email"
              type="email"
              placeholder="hello@vendor.com"
              disabled={isPending}
            />
          </div>
        </div>
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Adding…" : "Add vendor"}
        </Button>
      </form>
    </Card>
  );
}
