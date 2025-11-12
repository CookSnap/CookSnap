import { cn } from "@/lib/utils";
import type { LabelHTMLAttributes } from "react";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-xs font-semibold uppercase tracking-widest text-[rgb(var(--muted-foreground))]", className)} {...props} />;
}
