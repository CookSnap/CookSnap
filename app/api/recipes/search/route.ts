import { NextResponse } from "next/server";
import baseRecipes from "@/data/recipes.json";
import { searchOpenRecipes } from "@/lib/open-recipes";
import type { Recipe } from "@/types";

function localSearch(query: string): Recipe[] {
  const normalized = query.toLowerCase();
  const recipes = baseRecipes as Recipe[];
  return recipes
    .map((recipe) => ({
      recipe,
      score:
        recipe.title.toLowerCase().includes(normalized)
          ? 2
          : recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(normalized))
            ? 1
            : 0,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((entry) => entry.recipe);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();

  if (!query) {
    return NextResponse.json({ data: [] });
  }

  const recipes = await searchOpenRecipes(query, 10);

  if (recipes.length) {
    return NextResponse.json({ data: recipes });
  }

  return NextResponse.json({ data: localSearch(query) });
}
