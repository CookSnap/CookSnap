import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))]",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";
