"use client";

import { cn } from "@/lib/cn";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Delay in ms before the reveal transition starts (stagger). */
  delayMs?: number;
};

export function ScrollReveal({
  children,
  className,
  style,
  delayMs = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  /** Before mount: stay visible (SSR). After mount: hide until IO unless reduced motion. */
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduceMotion(true);
      setVisible(true);
      setArmed(true);
      return;
    }

    setVisible(false);
    setArmed(true);

    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const show = !armed || visible || reduceMotion;

  return (
    <div
      ref={ref}
      className={cn(
        armed &&
          !reduceMotion &&
          "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.2,0.7,0.3,1)]",
        show ? "translate-y-0 opacity-100" : "translate-y-[18px] opacity-0",
        className,
      )}
      style={{
        ...style,
        transitionDelay:
          armed && !reduceMotion && show ? `${delayMs}ms` : undefined,
      }}
    >
      {children}
    </div>
  );
}
