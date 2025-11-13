import { cn } from "@/lib/utils";
import type { LabelHTMLAttributes } from "react";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  /* biome-ignore lint/a11y/noLabelWithoutControl: association handled where the component is used */
  return <label className={cn("text-xs font-semibold uppercase tracking-widest text-[rgb(var(--muted-foreground))]", className)} {...props} />;
}
