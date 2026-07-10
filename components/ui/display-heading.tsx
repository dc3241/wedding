import { cn } from "@/lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

type DisplayHeadingSize = "sm" | "md" | "lg";

const sizeClass: Record<DisplayHeadingSize, string> = {
  sm: "text-display-sm",
  md: "text-display-md",
  lg: "text-display-lg",
};

type DisplayHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: "h1" | "h2" | "h3";
  size?: DisplayHeadingSize;
  children: ReactNode;
};

export function DisplayHeading({
  as: Tag = "h1",
  size = "lg",
  className,
  children,
  ...props
}: DisplayHeadingProps) {
  return (
    <Tag
      className={cn(sizeClass[size], "text-ink [&_em]:display-accent", className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
