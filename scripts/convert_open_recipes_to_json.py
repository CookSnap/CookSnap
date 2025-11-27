"""
Convert the MIT-licensed Open Recipes CSV into a JSON array that is easier to search.

Input files (expected):
- data/open-recipes/full_dataset.csv          : recipe metadata with ingredients/directions
- data/open-recipes/parsed_ingredients.csv    : parsed ingredient rows (quantity/unit/name)

Output:
- data/open-recipes/recipes_clean.json        : pretty-printed JSON array, one object per recipe
  Fields:
    id: recipe index from the CSV
    title: recipe title
    link: source URL
    source: source name
    ingredients: list of cleaned ingredient names (no counts/units)
    ingredients_count: number of cleaned ingredients
    directions: list of direction strings (when available)

Notes:
- This script replaces the original NER/ingredients payload with the cleaned ingredient names.
- The output is pretty-printed (indent=2) for readability, not minified.
"""

from __future__ import annotations

import csv
import json
import pathlib
from collections import defaultdict
from typing import Dict, List

ROOT = pathlib.Path(__file__).resolve().parent.parent
FULL_DATASET = ROOT / "data" / "open-recipes" / "full_dataset.csv"
PARSED_INGREDIENTS = ROOT / "data" / "open-recipes" / "parsed_ingredients.csv"
OUTPUT_JSON = ROOT / "data" / "open-recipes" / "recipes_clean.json"


def load_parsed_ingredients(path: pathlib.Path) -> Dict[str, List[str]]:
  grouped: Dict[str, List[str]] = defaultdict(list)
  with path.open(newline="", encoding="utf-8") as handle:
    reader = csv.DictReader(handle)
    for row in reader:
      recipe_idx = row.get("recipe_index", "").strip()
      ingredient = (row.get("ingredient") or "").strip()
      if not recipe_idx or not ingredient:
        continue
      grouped[recipe_idx].append(ingredient)
  return grouped


def main() -> None:
  if not FULL_DATASET.exists():
    raise FileNotFoundError(f"Missing input CSV: {FULL_DATASET}")
  if not PARSED_INGREDIENTS.exists():
    raise FileNotFoundError(f"Missing parsed ingredients CSV: {PARSED_INGREDIENTS}")

  parsed = load_parsed_ingredients(PARSED_INGREDIENTS)
  recipes = []

  with FULL_DATASET.open(newline="", encoding="utf-8") as handle:
    reader = csv.DictReader(handle)
    for row in reader:
      recipe_idx = (row.get("") or row.get("index") or row.get("id") or "").strip()
      if not recipe_idx:
        continue

      clean_ingredients = parsed.get(recipe_idx, [])
      try:
        directions_raw = row.get("directions") or "[]"
        directions = json.loads(directions_raw)
        if not isinstance(directions, list):
          directions = []
      except Exception:
        directions = []

      recipes.append(
        {
          "id": recipe_idx,
          "title": row.get("title", ""),
          "link": row.get("link", ""),
          "source": row.get("source", ""),
          "ingredients": clean_ingredients,
          "ingredients_count": len(clean_ingredients),
          "directions": directions,
        }
      )

  OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
  with OUTPUT_JSON.open("w", encoding="utf-8") as handle:
    json.dump(recipes, handle, ensure_ascii=False, indent=2)

  print(f"Wrote {len(recipes)} recipes to {OUTPUT_JSON}")


if __name__ == "__main__":
  main()
