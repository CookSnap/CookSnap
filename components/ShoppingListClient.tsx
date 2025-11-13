"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface SuggestedIngredient {
  key: string;
  name: string;
  qty: number | null;
  unit: string | null;
  recipes: string[];
}

interface ShoppingListClientProps {
  suggested: SuggestedIngredient[];
}

type ManualEntry = {
  id: string;
  name: string;
  qty?: string;
  unit?: string;
  store?: string;
  note?: string;
  done: boolean;
};

const MANUAL_STORAGE_KEY = "cooksnap-shopping-manual";
const AUTO_STORAGE_KEY = "cooksnap-shopping-auto";

export function ShoppingListClient({ suggested }: ShoppingListClientProps) {
  const [manualItems, setManualItems] = useState<ManualEntry[]>([]);
  const [autoDone, setAutoDone] = useState<Record<string, boolean>>({});
  const [formValues, setFormValues] = useState({
    name: "",
    qty: "",
    unit: "",
    store: "",
    note: "",
  });
  const manualNameId = useId();
  const manualQtyId = useId();
  const manualUnitId = useId();
  const manualStoreId = useId();
  const manualNoteId = useId();

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedManual = window.localStorage.getItem(MANUAL_STORAGE_KEY);
      if (storedManual) {
        setManualItems(JSON.parse(storedManual) as ManualEntry[]);
      }
      const storedAuto = window.localStorage.getItem(AUTO_STORAGE_KEY);
      if (storedAuto) {
        setAutoDone(JSON.parse(storedAuto) as Record<string, boolean>);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify(manualItems));
  }, [manualItems]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUTO_STORAGE_KEY, JSON.stringify(autoDone));
  }, [autoDone]);

  const pendingSuggested = useMemo(
    () => suggested.filter((item) => !autoDone[item.key]),
    [suggested, autoDone]
  );

  const completedSuggested = useMemo(
    () => suggested.filter((item) => autoDone[item.key]),
    [suggested, autoDone]
  );

  const handleManualSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = formValues.name.trim();
    if (!name) return;
    const entry: ManualEntry = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
      name,
      qty: formValues.qty.trim() || undefined,
      unit: formValues.unit.trim() || undefined,
      store: formValues.store.trim() || undefined,
      note: formValues.note.trim() || undefined,
      done: false,
    };
    setManualItems((items) => [entry, ...items]);
    setFormValues({ name: "", qty: "", unit: "", store: "", note: "" });
  };

  const toggleAutoItem = (key: string) => {
    setAutoDone((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleManualItem = (id: string) => {
    setManualItems((items) => items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const removeManualItem = (id: string) => {
    setManualItems((items) => items.filter((item) => item.id !== id));
  };

  const downloadList = () => {
    const lines: string[] = [];
    lines.push("CookSnap shopping list", "");
    if (pendingSuggested.length) {
      lines.push("Auto suggestions:");
      pendingSuggested.forEach((item) => {
        const hasQty = item.qty !== null && item.qty !== undefined;
        const qty = hasQty ? `${item.qty}${item.unit ? ` ${item.unit}` : ""}` : "";
        const recipeHint = item.recipes.length ? ` (${item.recipes.join(", ")})` : "";
        lines.push(`- ${item.name}${qty ? ` – ${qty}` : ""}${recipeHint}`);
      });
      lines.push("");
    }
    const pendingManual = manualItems.filter((item) => !item.done);
    if (pendingManual.length) {
      lines.push("Manual reminders:");
      pendingManual.forEach((item) => {
        const qty = item.qty ? `${item.qty}${item.unit ? ` ${item.unit}` : ""}` : "";
        const meta = [qty, item.store, item.note].filter(Boolean).join(" · ");
        lines.push(`- ${item.name}${meta ? ` (${meta})` : ""}`);
      });
      lines.push("");
    }
    if (!pendingSuggested.length && !pendingManual.length) {
      lines.push("Nothing pending. 🎉");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "CookSnap-shopping-list.txt";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">Shopping intel</p>
          <h2 className="text-2xl font-semibold">Rescue the missing pieces</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadList}>
            Download list (.txt)
          </Button>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-4 rounded-3xl border border-[rgb(var(--border))]/60 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Auto list</h3>
              <p className="text-sm text-[rgb(var(--muted-foreground))]">Ingredients blocking your recommended recipes.</p>
            </div>
            <span className="text-xs text-[rgb(var(--muted-foreground))]">{pendingSuggested.length} pending</span>
          </div>
          <div className="space-y-3">
            {suggested.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted-foreground))]">Every recipe is covered. Time to cook!</p>
            ) : (
              suggested.map((item) => {
                const isDone = !!autoDone[item.key];
                const cappedRecipes = item.recipes.slice(0, 3);
                const extraCount = item.recipes.length - cappedRecipes.length;
                const recipeDetails = `${cappedRecipes.join(", ")}${extraCount > 0 ? ` +${extraCount} more` : ""}`;
                return (
                  <div
                    key={item.key}
                    className={cn(
                      "rounded-2xl border border-[rgb(var(--border))]/50 px-4 py-3 transition",
                      isDone ? "bg-[rgb(var(--accent))]/10 opacity-60 line-through" : "bg-[rgb(var(--accent))]/5"
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-[rgb(var(--muted-foreground))]">
                          {item.qty !== null && item.qty !== undefined
                            ? `${item.qty}${item.unit ? ` ${item.unit}` : ""}`
                            : "qty flexible"}{" "}
                          ({recipeDetails})
                        </p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => toggleAutoItem(item.key)}>
                        {isDone ? "Undo" : "Mark bought"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {completedSuggested.length ? (
            <details className="rounded-2xl border border-dashed border-[rgb(var(--border))]/60 px-4 py-3">
              <summary className="cursor-pointer text-xs uppercase tracking-widest text-[rgb(var(--muted-foreground))]">
                {completedSuggested.length} archived item(s)
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-[rgb(var(--muted-foreground))]">
                {completedSuggested.map((item) => (
                  <li key={`${item.key}-completed`}>{item.name}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
        <section className="space-y-4 rounded-3xl border border-[rgb(var(--border))]/60 p-6">
          <div>
            <h3 className="text-lg font-semibold">Manual reminders</h3>
            <p className="text-sm text-[rgb(var(--muted-foreground))]">Add the one-off items or other errands.</p>
          </div>
          <form className="space-y-3" onSubmit={handleManualSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor={manualNameId}>Item</Label>
              <Input
                id={manualNameId}
                placeholder="e.g., almond milk"
                value={formValues.name}
                onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={manualQtyId}>Qty</Label>
              <Input
                id={manualQtyId}
                placeholder="2"
                className="sm:max-w-[160px]"
                value={formValues.qty}
                onChange={(event) => setFormValues((prev) => ({ ...prev, qty: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={manualUnitId}>Unit</Label>
              <Input
                id={manualUnitId}
                placeholder="cartons"
                className="sm:max-w-[160px]"
                value={formValues.unit}
                onChange={(event) => setFormValues((prev) => ({ ...prev, unit: event.target.value }))}
              />
            </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={manualStoreId}>Store / aisle</Label>
              <Input
                id={manualStoreId}
                placeholder="Trader Joe's"
                value={formValues.store}
                onChange={(event) => setFormValues((prev) => ({ ...prev, store: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={manualNoteId}>Note</Label>
              <textarea
                id={manualNoteId}
                className="min-h-[70px] w-full rounded-xl border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))]"
                placeholder="Anything special to remember?"
                value={formValues.note}
                onChange={(event) => setFormValues((prev) => ({ ...prev, note: event.target.value }))}
              />
            </div>
            <Button type="submit" className="w-full">
              Add reminder
            </Button>
          </form>
          <div className="space-y-3">
            {manualItems.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted-foreground))]">No manual reminders yet.</p>
            ) : (
              manualItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border border-[rgb(var(--border))]/50 px-4 py-3",
                    item.done ? "opacity-60 line-through" : ""
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-[rgb(var(--muted-foreground))]">
                        {[
                          item.qty ? `${item.qty}${item.unit ? ` ${item.unit}` : ""}` : null,
                          item.store ?? null,
                          item.note ?? null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Just a reminder"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => toggleManualItem(item.id)}>
                        {item.done ? "Undo" : "Done"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeManualItem(item.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
