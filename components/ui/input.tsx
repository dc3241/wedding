import { cn } from "@/lib/cn";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const fieldClasses =
  "w-full rounded border border-stone bg-surface-2 px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-[#B6ABAD] focus:border-transparent focus:outline-2 focus:outline-plum focus:outline-offset-px disabled:opacity-50";

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(fieldClasses, className)} {...props} />;
}
