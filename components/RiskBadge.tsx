interface RiskProps {
  level: "safe" | "caution" | "risky" | "use-now";
}

const COLORS: Record<RiskProps["level"], string> = {
  safe: "bg-emerald-500/20 text-emerald-300",
  caution: "bg-amber-500/20 text-amber-200",
  risky: "bg-rose-500/20 text-rose-200",
  "use-now": "bg-red-600/30 text-red-200",
};

export function RiskBadge({ level }: RiskProps) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${COLORS[level]}`}>{level.replace("-", " ")}</span>;
}
