import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PantryClient } from "@/components/PantryClient";
import { createSupabaseServerClient, requireUserId } from "@/lib/supabase";
import { riskFor, nextCheckAt } from "@/lib/risk";
import type { Item } from "@/types";

async function loadPantry() {
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
      .eq("household_id", householdId)
      .order("added_at", { ascending: false });

    return { items: items as Item[] };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export default async function PantryPage() {
  const data = await loadPantry();

  if (data.error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/20 p-10 text-center">
        <h1 className="text-2xl font-semibold">Sign in to view your pantry</h1>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          CookSnap syncs directly with your Supabase household. Once you sign in, everything updates in real time.
        </p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const { items } = data;

  if (!items?.length) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <CardHeader>
          <CardTitle>Your pantry is empty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[rgb(var(--muted-foreground))]">
          <p>Add items via barcode, receipt, or manual entry to start tracking freshness.</p>
          <Button asChild>
            <Link href="/add">Add your first item</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const nextCheck = items
    .map((item) => nextCheckAt(item))
    .sort((a, b) => a.getTime() - b.getTime())
    .at(0);

  const dangerCount = items.filter((item) => ["risky", "use-now"].includes(riskFor(item))).length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold">Household pantry</h1>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          Next freshness pulse {nextCheck ? new Date(nextCheck).toLocaleDateString() : "soon"}. {dangerCount} item(s) need attention.
        </p>
      </header>
      <PantryClient initialItems={items} />
    </div>
  );
}
