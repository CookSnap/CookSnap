export interface Item {
  id: string;
  name: string;
  qty: number;
  unit: string | null;
  category: string | null;
  storage: string | null;
  barcode: string | null;
  opened: boolean;
  added_at: string;
  last_used_at: string | null;
  risk_level: "safe" | "caution" | "risky" | "use-now";
  user_id: string;
  household_id: string;
}

export interface RecipeIngredient {
  name: string;
  qty: number;
  unit: string;
}

export interface Recipe {
  id: string;
  title: string;
  time_min?: number;
  diet?: string;
  tags: string[];
  ingredients: RecipeIngredient[];
}
