"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface TopNavLinksProps {
  displayName?: string | null;
}

const NAV_ITEMS = [
  { href: "/add", label: "Add" },
  { href: "/pantry", label: "Pantry" },
  { href: "/recipes", label: "Recipes" },
  { href: "/shopping_list", label: "Shopping list" },
];

export function TopNavLinks({ displayName }: TopNavLinksProps) {
  const pathname = usePathname();

  const activeHref = useMemo(() => {
    if (!pathname) return null;
    const match = NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
    return match?.href ?? null;
  }, [pathname]);

  return (
    <div className="flex items-center gap-2 text-sm">
      {NAV_ITEMS.map((item) => {
        const active = activeHref === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-full px-4 py-2 transition hover:bg-[rgb(var(--accent))]/20",
              active ? "bg-[rgb(var(--accent))]/30 text-[rgb(var(--foreground))] shadow-sm" : "text-[rgb(var(--foreground))] dark:text-white/90"
            )}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
      {displayName ? (
        <Link
          href="/profile"
          className="hidden rounded-full bg-[rgb(var(--accent))]/20 px-4 py-2 text-xs font-semibold text-[rgb(var(--foreground))] transition hover:bg-[rgb(var(--accent))]/30 dark:bg-[rgb(var(--accent))]/35 dark:text-white md:inline-flex"
        >
          Hey, {displayName.split(" ")[0]}
        </Link>
      ) : (
        <Link
          className="rounded-full px-4 py-2 text-[rgb(var(--foreground))] transition hover:bg-[rgb(var(--accent))]/20 dark:text-white/90"
          href="/login"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
