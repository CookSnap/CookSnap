import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import Fuse from "fuse.js";
import type { Item, Recipe, RecipeIngredient } from "@/types";

interface EnrichedRecipe extends Recipe {
  _searchText: string;
  _tokens: string[];
  _nerTokens: string[];
}

let datasetPromise: Promise<EnrichedRecipe[]> | null = null;
let fusePromise: Promise<Fuse<EnrichedRecipe>> | null = null;

const DATASET_CSV_PATH = path.join(process.cwd(), "data/open-recipes/full_dataset.csv");
const DATASET_JSON_PATH = path.join(process.cwd(), "data/open-recipes/dataset.json");

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function normalizeLink(link: string | undefined): string | null {
  if (!link) return null;
  if (link.startsWith("http")) return link;
  return `https://${link}`;
}

function safeParseArray<T = string>(value: string | undefined): T[] {
  if (!value) return [];
  try {
    return JSON.parse(value) as T[];
  } catch {
    return [];
  }
}

function toRecipeIngredient(entry: string): RecipeIngredient {
  return {
    name: entry,
    qty: 0,
    unit: "",
  };
}

function toTags(source: string | undefined, ner: string[]): string[] {
  const tags = new Set<string>();
  if (source) tags.add(source.toLowerCase());
  ner.slice(0, 4).forEach((token) => {
    if (token) tags.add(token.toLowerCase());
  });
  if (!tags.size) tags.add("use-it-now");
  return Array.from(tags);
}

async function readDatasetFromCsv(): Promise<EnrichedRecipe[]> {
  const recipes: EnrichedRecipe[] = [];
  if (!fs.existsSync(DATASET_CSV_PATH)) {
    return recipes;
  }

  const stream = fs.createReadStream(DATASET_CSV_PATH, "utf8");
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let isHeader = true;
  let index = 0;

  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }

    if (!line.trim()) continue;
    const row = parseCsvLine(line);
    if (row.length < 7) continue;

    const [, title, ingredientsRaw, directionsRaw, linkRaw, sourceRaw, nerRaw] = row;
    if (!title) continue;

    const ingredients = safeParseArray<string>(ingredientsRaw).map(toRecipeIngredient);
    if (!ingredients.length) continue;

    const directions = safeParseArray<string>(directionsRaw);
    const ner = safeParseArray<string>(nerRaw);
    const searchText = `${title} ${ingredients.map((item) => item.name).join(" ")} ${directions.join(" ")}`.toLowerCase();
    const nerTokens = safeParseArray<string>(nerRaw)
      .map((token) => normalizeToken(token))
      .filter(Boolean);
    const tokenizedText = Array.from(
      new Set(
        searchText
          .split(/\s+/)
          .map((token) => normalizeToken(token))
          .filter(Boolean)
      )
    );
    const effectiveIngredients: RecipeIngredient[] = ingredients.length
      ? ingredients
      : nerTokens.map((token) => ({ name: token, qty: 0, unit: "" }));

    recipes.push({
      id: `open-${index++}`,
      title,
      time_min: undefined,
      diet: undefined,
      tags: toTags(sourceRaw, ner),
      ingredients: effectiveIngredients,
      source_url: normalizeLink(linkRaw),
      image_url: null,
      instructions: directions.join("\n"),
      _searchText: searchText,
      _tokens: tokenizedText,
      _nerTokens: nerTokens,
    });
  }

  return recipes;
}

async function readDatasetFromJson(): Promise<EnrichedRecipe[] | null> {
  if (!fs.existsSync(DATASET_JSON_PATH)) {
    return null;
  }

  const raw = await fs.promises.readFile(DATASET_JSON_PATH, "utf8");
  const payload = JSON.parse(raw) as Array<{
    title: string;
    ingredients: RecipeIngredient[];
    directions: string[];
    ner_tokens?: string[];
    link?: string | null;
    source?: string | null;
  }>;

  const recipes: EnrichedRecipe[] = payload.map((entry, index) => {
    const directions = entry.directions ?? [];
    const ingredients = entry.ingredients ?? [];
    const nerTokens = (entry.ner_tokens ?? []).map((token) => normalizeToken(token)).filter(Boolean);
    const tokenizedText = Array.from(
      new Set(
        `${entry.title} ${ingredients.map((item) => item.name).join(" ")} ${directions.join(" ")}`
          .toLowerCase()
          .split(/\s+/)
          .map((token) => normalizeToken(token))
          .filter(Boolean)
      )
    );

    const effectiveIngredients = ingredients.length ? ingredients : nerTokens.map((token) => ({ name: token, qty: 0, unit: "" }));

    return {
      id: `open-${index}`,
      title: entry.title,
      time_min: undefined,
      diet: undefined,
      tags: toTags(entry.source ?? undefined, nerTokens),
      ingredients: effectiveIngredients,
      source_url: entry.link ?? null,
      image_url: null,
      instructions: directions.join("\n"),
      _searchText: `${entry.title} ${ingredients.map((item) => item.name).join(" ")} ${directions.join(" ")}`.toLowerCase(),
      _tokens: tokenizedText,
      _nerTokens: nerTokens,
    };
  });

  return recipes;
}

async function loadDataset(): Promise<EnrichedRecipe[]> {
  if (!datasetPromise) {
    datasetPromise = (async () => {
      const fromJson = await readDatasetFromJson();
      if (fromJson?.length) {
        return fromJson;
      }
      return readDatasetFromCsv();
    })();
  }
  return datasetPromise;
}

async function loadFuse(): Promise<Fuse<EnrichedRecipe> | null> {
  const dataset = await loadDataset();
  if (!dataset.length) return null;
  if (!fusePromise) {
    fusePromise = Promise.resolve(
      new Fuse(dataset, {
        includeScore: true,
        threshold: 0.35,
        ignoreLocation: true,
        keys: [{ name: "title", weight: 1 }],
      })
    );
  }
  return fusePromise;
}

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function getRandomOpenRecipes(count: number): Promise<Recipe[]> {
  const dataset = await loadDataset();
  if (!dataset.length) return [];
  return shuffle(dataset)
    .slice(0, count)
    .map(stripInternalFields);
}

function scoreRecipeForPantry(recipe: EnrichedRecipe, items: Item[]): number {
  if (!items.length) return 0;
  const pantrySet = new Set(items.map((item) => normalizeToken(item.name)).filter(Boolean));
  const tokens = recipe._nerTokens.length ? recipe._nerTokens : recipe._tokens;
  const matches = tokens.filter((token) => pantrySet.has(token)).length;
  return matches / Math.max(tokens.length, 1);
}

export async function getBestPantryMatches(items: Item[], limit: number): Promise<Recipe[]> {
  if (!items.length) return [];
  const dataset = await loadDataset();
  const scored = dataset
    .map((recipe) => ({ recipe, score: scoreRecipeForPantry(recipe, items) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => stripInternalFields(entry.recipe));
  return scored;
}

export async function getUseNowRecipes(items: Item[], limit: number): Promise<Recipe[]> {
  const riskyItems = items.filter((item) => ["use-now", "risky"].includes(item.risk_level));
  if (!riskyItems.length) return [];
  const riskySet = new Set(riskyItems.map((item) => normalizeToken(item.name)).filter(Boolean));
  const dataset = await loadDataset();
  const scored = dataset
    .map((recipe) => ({
      recipe,
      score: (recipe._nerTokens.length ? recipe._nerTokens : recipe._tokens).filter((token) => riskySet.has(token)).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => stripInternalFields(entry.recipe));
  return scored;
}

export async function searchOpenRecipes(query: string, limit = 10): Promise<Recipe[]> {
  const normalized = normalizeToken(query);
  if (!normalized) return [];
  const dataset = await loadDataset();
  if (!dataset.length) return [];
  const fuse = await loadFuse();
  if (!fuse) return [];
  const results = fuse.search(normalized, { limit }).map((entry) => stripInternalFields(entry.item));
  if (results.length) return results;
  const tokens = normalized.split(" ").filter(Boolean);
  if (!tokens.length) return [];
  return dataset
    .map((recipe) => ({ recipe, score: scoreRecipeTokens(recipe, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => stripInternalFields(entry.recipe));
}

function stripInternalFields(recipe: EnrichedRecipe): Recipe {
  const { _searchText, _tokens, _nerTokens, ...publicRecipe } = recipe;
  return { ...publicRecipe, ner_tokens: recipe._nerTokens };
}

function scoreRecipeTokens(recipe: EnrichedRecipe, queryTokens: string[]): number {
  const tokens = recipe._tokens;
  let score = 0;
  for (const queryToken of queryTokens) {
    let best = 0;
    for (const token of tokens) {
      const similarity = tokenSimilarity(queryToken, token);
      if (similarity > best) {
        best = similarity;
      }
      if (best >= 0.95) break;
    }
    if (best > 0.4) {
      score += best;
    }
  }
  if (recipe.title.toLowerCase().includes(queryTokens[0] ?? "")) {
    score += 1;
  }
  return score;
}

function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const distance = levenshtein(a, b);
  const maxLength = Math.max(a.length, b.length) || 1;
  return 1 - distance / maxLength;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}
