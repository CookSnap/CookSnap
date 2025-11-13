import type { SupabaseClient } from "@supabase/supabase-js";
import type { Recipe, ExternalRecipe } from "@/types";

const SPOONACULAR_BASE_URL = "https://api.spoonacular.com";
const SPOONACULAR_PROVIDER = "spoonacular";
const MAX_RECIPE_AGE_MS = 1000 * 60 * 60 * 24; // 24h

interface SpoonacularRecipe {
  id: number;
  title: string;
  readyInMinutes?: number;
  servings?: number;
  image?: string;
  sourceUrl?: string;
  spoonacularSourceUrl?: string;
  summary?: string;
  instructions?: string;
  diets?: string[];
  dishTypes?: string[];
  extendedIngredients?: Array<{
    name?: string;
    original?: string;
    amount?: number;
    unit?: string;
  }>;
}

function assertApiKey(): string | null {
  if (!process.env.SPOONACULAR_API_KEY) {
    return null;
  }
  return process.env.SPOONACULAR_API_KEY;
}

function normalizeTags(recipe: SpoonacularRecipe): string[] {
  const tags = new Set<string>();
  for (const tag of recipe.diets ?? []) {
    tags.add(tag);
  }
  for (const tag of recipe.dishTypes ?? []) {
    tags.add(tag);
  }
  tags.add("use-it-now");
  return Array.from(tags);
}

function normalizeIngredients(recipe: SpoonacularRecipe) {
  const list = recipe.extendedIngredients ?? [];
  return list.map((ingredient) => ({
    name: ingredient.name ?? ingredient.original ?? "Ingredient",
    qty: ingredient.amount ?? 0,
    unit: ingredient.unit ?? "",
  }));
}

function mapExternalRowToRecipe(row: ExternalRecipe): Recipe {
  return {
    id: row.id,
    title: row.title,
    time_min: row.total_time ?? undefined,
    diet: row.diet_tags?.[0] ?? undefined,
    tags: row.diet_tags?.length ? row.diet_tags : ["use-it-now"],
    ingredients: row.ingredients ?? [],
    source_url: row.source_url ?? undefined,
    image_url: row.image_url ?? undefined,
    instructions: row.instructions ?? undefined,
  };
}

async function fetchSpoonacularRecipes(count: number): Promise<ExternalRecipe[]> {
  const apiKey = assertApiKey();
  if (!apiKey) {
    return [];
  }

  const number = Math.min(Math.max(count, 1), 12);
  const url = new URL("/recipes/random", SPOONACULAR_BASE_URL);
  url.searchParams.set("number", String(number));
  url.searchParams.set("tags", "dinner");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url, { next: { revalidate: 60 } });
  if (!response.ok) {
    throw new Error(`Spoonacular responded with ${response.status}`);
  }

  const body = (await response.json()) as { recipes: SpoonacularRecipe[] };
  const recipes = body.recipes ?? [];

  return recipes.map((recipe) => ({
    provider: SPOONACULAR_PROVIDER,
    external_id: String(recipe.id),
    title: recipe.title,
    image_url: recipe.image ?? null,
    source_url: recipe.sourceUrl ?? recipe.spoonacularSourceUrl ?? null,
    summary: recipe.summary ?? null,
    instructions: recipe.instructions ?? null,
    ingredients: normalizeIngredients(recipe),
    diet_tags: normalizeTags(recipe),
    total_time: recipe.readyInMinutes ?? null,
    servings: recipe.servings ?? null,
    last_synced_at: new Date().toISOString(),
  }));
}

export async function getRecipeSuggestions(
  supabase: SupabaseClient,
  { take = 8 }: { take?: number } = {}
): Promise<Recipe[]> {
  const limit = Math.max(take, 1);
  const { data: cached = [] } = await supabase
    .from("external_recipes")
    .select("*")
    .order("last_synced_at", { ascending: false })
    .limit(limit);

  if (cached.length >= limit && cached.every((recipe) => Date.now() - new Date(recipe.last_synced_at).getTime() < MAX_RECIPE_AGE_MS)) {
    return cached.map((row) => mapExternalRowToRecipe(row as ExternalRecipe));
  }

  try {
    const fresh = await fetchSpoonacularRecipes(limit - cached.length || limit);
    if (fresh.length) {
      await supabase.from("external_recipes").upsert(fresh, { onConflict: "provider,external_id" });
      const { data: refreshed = [] } = await supabase
        .from("external_recipes")
        .select("*")
        .order("last_synced_at", { ascending: false })
        .limit(limit);
      return refreshed.map((row) => mapExternalRowToRecipe(row as ExternalRecipe));
    }
  } catch (error) {
    console.warn("Unable to refresh external recipes", error);
  }

  if (cached.length) {
    return cached.map((row) => mapExternalRowToRecipe(row as ExternalRecipe));
  }

  return [];
}
