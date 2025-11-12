import type { Item, Recipe } from "@/types";
import { riskFor } from "@/lib/risk";

export function getUseItNow(items: Item[], recipes: Recipe[]): Recipe[] {
  if (!items.length) return recipes.slice(0, 3);

  const nearExpiry = new Set(
    items.filter((item) => ["use-now", "risky"].includes(riskFor(item))).map((item) => item.name.toLowerCase())
  );

  return [...recipes]
    .map((recipe) => {
      const hitCount = recipe.ingredients.reduce((count, ingredient) => {
        return nearExpiry.has(ingredient.name.toLowerCase()) ? count + 1 : count;
      }, 0);
      return { recipe, score: hitCount / Math.max(recipe.ingredients.length, 1) };
    })
    .sort((a, b) => b.score - a.score || (a.recipe.time_min ?? 0) - (b.recipe.time_min ?? 0))
    .map(({ recipe }) => recipe)
    .slice(0, 6);
}
