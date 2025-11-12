"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Item } from "@/types";
import { RiskBadge } from "@/components/RiskBadge";
import { riskFor } from "@/lib/risk";

interface PantryClientProps {
  initialItems: Item[];
}

export function PantryClient({ initialItems }: PantryClientProps) {
  const [items] = useState(initialItems);

  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--border))]/50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{item.name}</p>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              {item.qty} {item.unit ?? ""} · {item.category ?? "Uncategorized"}
            </p>
          </div>
          <RiskBadge level={riskFor(item)} />
          <Button variant="ghost" size="sm">
            Mark used
          </Button>
        </div>
      ))}
    </div>
  );
}
