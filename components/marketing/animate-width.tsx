"use client";

import { cn } from "@/lib/cn";
import { useEffect, useRef, useState } from "react";

type AnimateWidthProps = {
  /** Target width as a percentage of the parent track (0–100). */
  widthPercent: number;
  className?: string;
};

/** Fills to `widthPercent` when scrolled into view. Reduced-motion shows final width immediately. */
export function AnimateWidth({ widthPercent, className }: AnimateWidthProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyReduce = () => {
      setReduceMotion(mq.matches);
      if (mq.matches) setActive(true);
    };
    applyReduce();
    mq.addEventListener("change", applyReduce);

    if (mq.matches) {
      return () => mq.removeEventListener("change", applyReduce);
    }

    const el = ref.current;
    if (!el) return () => mq.removeEventListener("change", applyReduce);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(true);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      mq.removeEventListener("change", applyReduce);
    };
  }, []);

  const show = active || reduceMotion;

  return (
    <div
      ref={ref}
      className={cn(
        "h-full",
        !reduceMotion &&
          "transition-[width] duration-[1100ms] ease-[cubic-bezier(0.3,0.8,0.3,1)]",
        className,
      )}
      style={{ width: show ? `${widthPercent}%` : 0 }}
    />
  );
}
