"use client";

import { Button } from "@/components/ui/button";
import { VENDOR_CATEGORIES } from "@/lib/directory/categories";
import type { DirectoryState } from "@/lib/directory/states";
import { useRouter } from "next/navigation";
import { useState } from "react";

const selectClass =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-3 text-[15px] font-medium text-ink";

/** MEDIA-01: homepage hero search into the public directory. */
export function VendorSearch({ states }: { states: readonly DirectoryState[] }) {
  const router = useRouter();
  const [category, setCategory] = useState("venues");
  const [stateSlug, setStateSlug] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (!stateSlug) {
      router.push("/wedding-vendors");
      return;
    }
    router.push(
      category === "venues"
        ? `/wedding-vendors/${stateSlug}`
        : `/wedding-vendors/${stateSlug}/${category}`,
    );
  }

  return (
    <form
      onSubmit={go}
      className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-raised sm:grid-cols-[1fr_1fr_auto]"
      aria-label="Find wedding vendors"
    >
      <label className="sr-only" htmlFor="vs-category">
        Vendor type
      </label>
      <select
        id="vs-category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={selectClass}
      >
        <option value="venues">Venues</option>
        {VENDOR_CATEGORIES.map((c) => (
          <option key={c.path} value={c.path}>
            {c.tab}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="vs-state">
        State
      </label>
      <select
        id="vs-state"
        value={stateSlug}
        onChange={(e) => setStateSlug(e.target.value)}
        className={selectClass}
      >
        <option value="">Any state</option>
        {states.map((s) => (
          <option key={s.slug} value={s.slug}>
            {s.name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="primary" className="py-3">
        Search
      </Button>
    </form>
  );
}
