"use client";

import { useMemo, useState, useEffect } from "react";
import type { Item, Recipe } from "@/types";
import { RecipeCard } from "@/components/RecipeCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface RecipesClientProps {
  items: Item[];
  featured: Recipe[];
  pantryMatches: Recipe[];
  useNow: Recipe[];
  fallbackRecipes: Recipe[];
  datasetAvailable: boolean;
}

export function RecipesClient({ items, featured, pantryMatches, useNow, fallbackRecipes, datasetAvailable }: RecipesClientProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return () => controller.abort();
    }

    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/recipes/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        const body = (await response.json()) as { data?: Recipe[] };
        setResults(body.data ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Search failed. Try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
    return () => controller.abort();
  }, [query]);

  const showSearchResults = Boolean(query.trim());

  const unavailableNotice = useMemo(() => {
    if (datasetAvailable) return null;
    if (fallbackRecipes.length) {
      return "Using bundled in-repo recipes. Add data/open-recipes/full_dataset.csv for a larger set.";
    }
    return "Add data/open-recipes/full_dataset.csv to unlock the full recipe dataset.";
  }, [datasetAvailable, fallbackRecipes.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Input
          placeholder="Search for recipes or ingredients"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="flex-1"
        />
        {query ? (
          <Button variant="ghost" onClick={() => setQuery("")}>Clear</Button>
        ) : null}
      </div>

      {unavailableNotice ? <p className="text-xs text-[rgb(var(--muted-foreground))]">{unavailableNotice}</p> : null}

      {showSearchResults ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Search results</p>
            {loading ? <span className="text-xs text-[rgb(var(--muted-foreground))]">Searching…</span> : null}
          </div>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            {results.length ? (
              results.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} pantryItems={items} />)
            ) : loading ? null : (
              <p className="text-sm text-[rgb(var(--muted-foreground))]">No recipes matched that search.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          <RecipeSection title="Ready now" subtitle="Highest pantry match" recipes={pantryMatches} fallback="No close matches yet." items={items} />
          <RecipeSection title="Use-it-now saver" subtitle="Uses risky ingredients" recipes={useNow} fallback="Nothing urgent. Keep cooking!" items={items} />
          <RecipeSection title="Chef's inspiration" subtitle="Random picks" recipes={featured} fallback="Add recipes to get inspired." items={items} />
        </div>
      )}
    </div>
  );
}

interface RecipeSectionProps {
  title: string;
  subtitle: string;
  recipes: Recipe[];
  fallback: string;
  items: Item[];
}

function RecipeSection({ title, subtitle, recipes, fallback, items }: RecipeSectionProps) {
  if (!recipes.length) {
    return (
      <section className="space-y-2">
        <header>
          <p className="text-xs uppercase tracking-wide text-[rgb(var(--muted-foreground))]">{title}</p>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">{fallback}</p>
        </header>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-[rgb(var(--muted-foreground))]">{title}</p>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">{subtitle}</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} pantryItems={items} />
        ))}
      </div>
    </section>
  );
}
