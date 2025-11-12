"use client";

import { useMemo, useState } from "react";
import type { Item, Recipe } from "@/types";
import { RecipeCard } from "@/components/RecipeCard";

interface RecipesClientProps {
  items: Item[];
  recipes: Recipe[];
}

export function RecipesClient({ items, recipes }: RecipesClientProps) {
  const [filter, setFilter] = useState<string>("all");
  const [maxTime, setMaxTime] = useState<number>(45);

  const filtered = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesDiet = filter === "all" || recipe.tags.includes(filter);
      const matchesTime = (recipe.time_min ?? 0) <= maxTime;
      return matchesDiet && matchesTime;
    });
  }, [recipes, filter, maxTime]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {items.length ? <span className="text-xs text-[rgb(var(--muted-foreground))]">{items.length} pantry items tracked</span> : null}
        <select
          className="rounded-full border border-[rgb(var(--border))]/50 bg-transparent px-3 py-1 text-xs"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">All tags</option>
          <option value="use-it-now">Use it now</option>
          <option value="weeknight">Weeknight</option>
          <option value="breakfast">Breakfast</option>
        </select>
        <label className="text-xs text-[rgb(var(--muted-foreground))]">
          Max time
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={maxTime}
            onChange={(event) => setMaxTime(Number(event.target.value))}
            className="ml-2"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
        {!filtered.length ? <p className="text-sm text-[rgb(var(--muted-foreground))]">No recipes match those filters.</p> : null}
      </div>
    </div>
  );
}
