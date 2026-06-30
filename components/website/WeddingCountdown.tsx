"use client";

import { useEffect, useState } from "react";
import { daysUntilWedding } from "./template-utils";

type WeddingCountdownProps = {
  weddingDate: string;
  align?: "left" | "center";
};

export function WeddingCountdown({ weddingDate, align = "center" }: WeddingCountdownProps) {
  const [days, setDays] = useState(() => daysUntilWedding(weddingDate));

  useEffect(() => {
    setDays(daysUntilWedding(weddingDate));
    const interval = window.setInterval(() => {
      setDays(daysUntilWedding(weddingDate));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [weddingDate]);

  return (
    <div className={align === "left" ? "mt-8" : "mt-8 text-center"}>
      <div
        className="font-display tabnum text-[64px] leading-none"
        style={{ color: "var(--ws-accent)" }}
      >
        {days}
      </div>
      <div
        className="mt-1.5 text-[13px] tracking-[0.04em]"
        style={{ color: "var(--ws-muted)" }}
      >
        days to go
      </div>
    </div>
  );
}
