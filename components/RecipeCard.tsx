import type { Recipe } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return (
    <Card className="h-full bg-[rgb(var(--accent))]/10">
      <CardHeader>
        <CardTitle className="text-base">{recipe.title}</CardTitle>
        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">{recipe.tags.join(" · ")}</p>
      </CardHeader>
      <CardContent className="text-sm text-[rgb(var(--muted-foreground))]">
        <p>{recipe.time_min ?? 20} min · {recipe.diet ?? "any"}</p>
        <ul className="mt-2 list-disc pl-4">
          {recipe.ingredients.slice(0, 3).map((ingredient) => (
            <li key={`${recipe.id}-${ingredient.name}`}>
              {ingredient.qty} {ingredient.unit} {ingredient.name}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
