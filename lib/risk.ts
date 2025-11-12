import type { Item } from "@/types";

const RISK_WINDOWS: Record<string, number> = {
  "use-now": 1,
  risky: 3,
  caution: 7,
  safe: 14,
};

export function riskFor(item: Item): Item["risk_level"] {
  if (item.opened) return "risky";
  if (!item.added_at) return "safe";

  const days = (Date.now() - new Date(item.added_at).getTime()) / 86_400_000;
  if (days > 10) return "use-now";
  if (days > 6) return "risky";
  if (days > 3) return "caution";
  return "safe";
}

export function nextCheckAt(item: Item): Date {
  const level = RISK_WINDOWS[item.risk_level] ?? 7;
  const added = item.added_at ? new Date(item.added_at) : new Date();
  const next = new Date(added);
  next.setDate(next.getDate() + level);
  return next;
}
