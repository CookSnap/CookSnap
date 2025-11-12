import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-[rgb(var(--accent))] text-black hover:bg-[rgb(var(--accent))]/80",
  outline: "border border-[rgb(var(--border))] text-[rgb(var(--foreground))]",
  ghost: "text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--accent))]/20",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button ref={ref} className={cn("inline-flex items-center justify-center rounded-full font-semibold transition", variants[variant], sizes[size], className)} {...props} />
  )
);

Button.displayName = "Button";
