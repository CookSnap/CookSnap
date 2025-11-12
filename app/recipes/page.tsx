import Link from "next/link";
import { Button } from "@/components/ui/button";
import baseRecipes from "@/data/recipes.json";
import { createSupabaseServerClient, requireUserId } from "@/lib/supabase";
import type { Item, Recipe } from "@/types";
import { RecipesClient } from "@/components/RecipesClient";

async function loadContext() {
  const supabase = await createSupabaseServerClient();
  try {
    const userId = await requireUserId(supabase);
    const { data: membership } = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", userId)
      .maybeSingle();

    const householdId = membership?.household_id ?? null;

    const { data: items = [] } = await supabase
      .from("items")
      .select("*")
      .eq("household_id", householdId);

    const { data: dbRecipes = [] } = await supabase.from("recipes").select("*").order("time_min", { ascending: true });

    const recipes: Recipe[] = dbRecipes.length ? (dbRecipes as Recipe[]) : (baseRecipes as Recipe[]);

    return { items: items as Item[], recipes };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export default async function RecipesPage() {
  const context = await loadContext();

  if (context.error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/20 p-10 text-center">
        <h1 className="text-2xl font-semibold">Use-it-now recipes, once you sign in</h1>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          Sign in to unlock personalized recommendations built from your pantry timeline.
        </p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const { items, recipes } = context;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Use-it-now recipes</h1>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          Sorted by how much near-expiry inventory they rescue. Dial in diet, tags, and cook time without leaving the page.
        </p>
      </header>
      <RecipesClient items={items} recipes={recipes} />
    </div>
  );
}
