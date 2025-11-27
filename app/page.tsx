import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecipeCard } from "@/components/RecipeCard";
import { RiskBadge } from "@/components/RiskBadge";
import recipes from "@/data/recipes.json";
import { getUseItNow } from "@/lib/recommend";
import { createSupabaseServerClient } from "@/lib/supabase";
import { riskFor } from "@/lib/risk";
import { getStorageCategoryLabel, normalizeStorageCategory } from "@/lib/storage";
import type { Item, Recipe } from "@/types";

type DashboardData = {
  items: Item[];
  events: Array<{ id: string; type: string; payload: unknown; created_at: string }>;
  recommended: Recipe[];
  summary: { totalItems: number; risky: number; lastEvent: string | null };
};

type DashboardResult = DashboardData | { error: string } | { unauthenticated: true };

async function getDashboard(): Promise<DashboardResult> {
  const supabase = await createSupabaseServerClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { unauthenticated: true };
    }

    const userId = user.id;

    const membershipPromise = supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", userId)
      .maybeSingle();

    const eventsPromise = supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6);

    const [{ data: membership }, { data: eventsData }] = await Promise.all([membershipPromise, eventsPromise]);

    const householdId = membership?.household_id ?? null;
    let typedItems: Item[] = [];
    const events = (eventsData ?? []) as Array<{ id: string; type: string; payload: unknown; created_at: string }>;

    if (householdId) {
      const { data: items = [] } = await supabase
        .from("items")
        .select("*, storage_location:storage_locations(*)")
        .eq("household_id", householdId)
        .order("added_at", { ascending: false });
      typedItems = items as Item[];
    }

    const recommended = getUseItNow(typedItems, recipes as Recipe[]);

    const summary = {
      totalItems: typedItems.length,
      risky: typedItems.filter((item) => ["use-now", "risky"].includes(riskFor(item))).length,
      lastEvent: events.at(0)?.created_at ?? null,
    };

    return { items: typedItems, events, recommended, summary };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

function SignInCTA() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/15 shadow-lg">
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <video
          className="h-72 w-full object-cover md:h-96"
          src="/demo.mp4"
          poster="/demo-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          controls
        >
          Your browser does not support the video tag.
        </video>
        <div className="absolute bottom-0 left-0 right-0 z-20 p-6 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">See it in action</p>
          <h2 className="text-2xl font-semibold">Scan. Cook. Share.</h2>
          <p className="mt-2 text-sm text-white/80">Swap in your own demo video at /public/demo.mp4 to show the flow.</p>
        </div>
      </div>

      <div className="space-y-6 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/15 p-8 shadow-lg">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">Welcome</p>
          <h1 className="text-3xl font-semibold text-[rgb(var(--foreground))]">CookSnap keeps your fridge honest.</h1>
          <p className="text-sm text-[rgb(var(--muted-foreground))]">
            Scan barcodes, track pantry freshness, and pull recipes that match what you already own.
          </p>
        </div>
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/10 p-4">
          <p className="text-xs uppercase tracking-wide text-[rgb(var(--muted-foreground))]">Highlights</p>
          <ul className="mt-2 space-y-2 text-sm text-[rgb(var(--foreground))]">
            <li>• 200k+ recipes tailored to your pantry</li>
            <li>• Use-it-now alerts before food expires</li>
            <li>• Shared shopping lists with barcode scans</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/login">
            <Button size="lg">Sign in with Google</Button>
          </Link>
          <Link href="/recipes" className="inline-flex">
            <Button variant="outline" size="lg">Browse recipes</Button>
          </Link>
        </div>
        <p className="text-xs text-[rgb(var(--muted-foreground))]">No password needed—Google SSO keeps it simple.</p>
      </div>
    </div>
  );
}

function ActivityList({ events }: { events: Array<{ id: string; type: string; payload: unknown; created_at: string }> }) {
  if (!events.length) {
    return <p className="text-sm text-[rgb(var(--muted-foreground))]">No activity yet — add something to kick off tracking.</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {events.map((event) => (
        <li key={event.id} className="flex items-baseline justify-between rounded-2xl bg-[rgb(var(--accent))]/20 px-4 py-3">
          <span className="capitalize">{event.type.replace(/_/g, " ")}</span>
          <time className="text-[rgb(var(--muted-foreground))]">{new Date(event.created_at).toLocaleString()}</time>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  const data = await getDashboard();

  if ("error" in data) {
    return <SignInCTA />;
  }

  if ("unauthenticated" in data) {
    return <SignInCTA />;
  }

  const { items, events, recommended, summary } = data;

  return (
    <section className="space-y-8">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.totalItems}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{summary.risky}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Last activity</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {summary.lastEvent ? new Date(summary.lastEvent).toLocaleString() : "—"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Use-it-now recipes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {recommended.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} pantryItems={items} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Latest events</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityList events={events} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recently added</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.slice(0, 6).map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-[rgb(var(--border))]/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-[rgb(var(--muted-foreground))]">
                  {item.qty} {item.unit ?? ""} ·{" "}
                  {item.storage_location?.name ?? getStorageCategoryLabel(normalizeStorageCategory(item.storage))}
                </p>
              </div>
              <RiskBadge level={riskFor(item)} />
            </div>
          ))}
          {!items.length ? <p className="text-sm text-[rgb(var(--muted-foreground))]">Add your first item to see it here.</p> : null}
        </CardContent>
      </Card>
    </section>
  );
}
