"use client";

import { Button } from "@/components/ui/button";

export function PrintContractButton() {
  return (
    <Button
      type="button"
      variant="primary"
      onClick={() => window.print()}
      className="print:hidden"
    >
      Print / Save as PDF
    </Button>
  );
}
