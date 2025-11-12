"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics";

interface AddManualProps {
  onAdded?: () => Promise<void> | void;
}

const DEFAULT_STORAGE = [
  { label: "Counter", value: "ambient" },
  { label: "Fridge", value: "fridge" },
  { label: "Freezer", value: "freezer" },
];

export function AddManual({ onAdded }: AddManualProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    qty: "1",
    unit: "",
    category: "",
    storage: DEFAULT_STORAGE[0].value,
  });

  const handleChange = <Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: form.name,
        qty: Number(form.qty) || 1,
        unit: form.unit || null,
        category: form.category || null,
        storage: form.storage,
      };

      const response = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to save item");
      }

      await track("add_item", { method: "manual", name: payload.name });
      setForm({ name: "", qty: "1", unit: "", category: "", storage: DEFAULT_STORAGE[0].value });
      await onAdded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="name">Item name</Label>
        <Input id="name" required value={form.name} onChange={(event) => handleChange("name", event.target.value)} placeholder="Shelf-stable almond milk" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="qty">Quantity</Label>
          <Input id="qty" type="number" min="0" step="0.1" value={form.qty} onChange={(event) => handleChange("qty", event.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" value={form.unit} onChange={(event) => handleChange("unit", event.target.value)} placeholder="bottle, ct, g" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category">Category</Label>
        <Input id="category" value={form.category} onChange={(event) => handleChange("category", event.target.value)} placeholder="Pantry, Produce, Dairy" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="storage">Storage</Label>
        <div className="flex gap-2">
          {DEFAULT_STORAGE.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={form.storage === option.value ? "default" : "outline"}
              onClick={() => handleChange("storage", option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <Button disabled={loading} type="submit" className="h-12">
        {loading ? "Adding…" : "Add item"}
      </Button>
    </form>
  );
}
