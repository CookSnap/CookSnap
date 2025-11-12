import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingListClient, type SuggestedIngredient } from "@/components/ShoppingListClient";
import baseRecipes from "@/data/recipes.json";
import { createSupabaseServerClient, requireUserId } from "@/lib/supabase";
import type { Item, Recipe } from "@/types";

async function loadShoppingContext() {
  const supabase = await createSupabaseServerClient();
  try {
    const userId = await requireUserId(supabase);
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", userId)
      .maybeSingle();

    const householdId = membership?.household_id ?? null;

    let items: Item[] = [];
    if (householdId) {
      const { data: householdItems } = await supabase.from("items").select("*").eq("household_id", householdId);
      items = (householdItems ?? []) as Item[];
    }

    const { data: dbRecipes = [] } = await supabase.from("recipes").select("*").order("time_min", { ascending: true });

    const recipes: Recipe[] = dbRecipes.length ? (dbRecipes as Recipe[]) : (baseRecipes as Recipe[]);

    return { items, recipes };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

function buildSuggestions(items: Item[], recipes: Recipe[]): SuggestedIngredient[] {
  const pantryNames = new Set(items.map((item) => item.name.trim().toLowerCase()));
  const lookup: Record<string, SuggestedIngredient> = {};

  recipes.forEach((recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const normalized = ingredient.name.trim().toLowerCase();
      if (!normalized.length || pantryNames.has(normalized)) {
        return;
      }

      const existing = lookup[normalized];
      if (!existing) {
        lookup[normalized] = {
          key: normalized,
          name: ingredient.name,
          qty: typeof ingredient.qty === "number" ? ingredient.qty : null,
          unit: ingredient.unit ?? null,
          recipes: [recipe.title],
        };
        return;
      }

      existing.recipes.push(recipe.title);
      if (typeof ingredient.qty === "number") {
        existing.qty = typeof existing.qty === "number" ? existing.qty + ingredient.qty : ingredient.qty;
      }
      if (existing.unit && ingredient.unit && existing.unit !== ingredient.unit) {
        existing.unit = null;
      } else if (!existing.unit && ingredient.unit) {
        existing.unit = ingredient.unit;
      }
    });
  });

  return Object.values(lookup).sort((a, b) => {
    if (b.recipes.length !== a.recipes.length) {
      return b.recipes.length - a.recipes.length;
    }
    return a.name.localeCompare(b.name);
  });
}

export default async function ShoppingListPage() {
  const context = await loadShoppingContext();

  if (context.error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/20 p-10 text-center">
        <h1 className="text-2xl font-semibold">Shopping intel lives here</h1>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          Sign in to see which groceries unlock your use-it-now recipes and jot down manual reminders.
        </p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const { items, recipes } = context;
  const suggested = buildSuggestions(items, recipes);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Shopping list</h1>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          Auto-generated gaps from your recommended recipes plus space for manual reminders and shareable downloads.
        </p>
      </header>
      <ShoppingListClient suggested={suggested} />
    </div>
  );
}
