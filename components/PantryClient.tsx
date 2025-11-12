"use client";

import { useState } from "react";
import type { Item } from "@/types";
import { RiskBadge } from "@/components/RiskBadge";
import { riskFor } from "@/lib/risk";

const STORAGE_SECTIONS = [
  { key: "pantry", label: "Pantry" },
  { key: "fridge", label: "Fridge" },
  { key: "freezer", label: "Freezer" },
] as const;

const RISK_CLUSTERS: { key: string; label: string; levels: Item["risk_level"][] }[] = [
  { key: "safe", label: "Safe", levels: ["safe"] },
  { key: "use-now", label: "Use now", levels: ["caution", "use-now"] },
  { key: "risky", label: "Risky", levels: ["risky"] },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function formatAddedAt(value: string | null) {
  if (!value) {
    return "Date unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unknown";
  }

  const formatted = dateFormatter.format(date);
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  const relative = days === 0 ? "today" : `${days}d ago`;
  return `Added ${formatted} · ${relative}`;
}

interface PantryClientProps {
  initialItems: Item[];
}

export function PantryClient({ initialItems }: PantryClientProps) {
  const [items] = useState(initialItems);

  if (!items.length) {
    return null;
  }

  const storageKeys = STORAGE_SECTIONS.map((section) => section.key);
  const storageGroups = items.reduce<Record<string, Item[]>>((acc, item) => {
    const normalized = item.storage?.toLowerCase() ?? "pantry";
    const key = storageKeys.includes(normalized) ? normalized : "other";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  const orderedSections = [
    ...STORAGE_SECTIONS.filter((section) => storageGroups[section.key]?.length).map((section) => ({
      ...section,
      items: storageGroups[section.key] ?? [],
    })),
    ...(storageGroups.other
      ? [
          {
            key: "other",
            label: "Other storage",
            items: storageGroups.other,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-10">
      {orderedSections.map((section) => (
        <section key={section.key} className="space-y-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-[rgb(var(--muted-foreground))]">Storage</p>
              <h2 className="text-2xl font-semibold">{section.label}</h2>
            </div>
            <span className="text-xs text-[rgb(var(--muted-foreground))]">{section.items.length} item(s)</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {RISK_CLUSTERS.map((cluster) => {
              const clusterItems = section.items.filter((item) => cluster.levels.includes(riskFor(item)));

              return (
                <div
                  key={cluster.key}
                  className="rounded-3xl border border-[rgb(var(--border))]/50 bg-[rgb(var(--card))] p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[rgb(var(--foreground))]">{cluster.label}</h3>
                    <span className="text-xs text-[rgb(var(--muted-foreground))]">{clusterItems.length}</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {clusterItems.length ? (
                      clusterItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-[rgb(var(--border))]/40 bg-[rgb(var(--accent))]/10 px-3 py-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-[rgb(var(--muted-foreground))]">{formatAddedAt(item.added_at)}</p>
                            </div>
                            <RiskBadge level={riskFor(item)} />
                          </div>
                          <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                            {item.qty} {item.unit ?? ""} · {item.category ?? "Uncategorized"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[rgb(var(--muted-foreground))]">No items here.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
