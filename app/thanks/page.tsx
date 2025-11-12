import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";

export default async function ThanksPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = user.user_metadata?.full_name ?? user.email ?? "friend";

  return (
    <section className="space-y-4 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/20 p-8 text-center">
      <p className="text-sm uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">Synced</p>
      <h1 className="text-3xl font-semibold">Thanks, {name}!</h1>
      <p className="text-sm text-[rgb(var(--muted-foreground))]">
        Your CookSnap household is connected. Jump into the pantry, add new finds, or pull a use-it-now recipe.
      </p>
      <div className="flex flex-wrap justify-center gap-3 text-sm">
        <a className="rounded-full bg-[rgb(var(--foreground))] px-5 py-2 text-[rgb(var(--background))]" href="/pantry">
          Go to pantry
        </a>
        <a className="rounded-full border border-[rgb(var(--border))] px-5 py-2" href="/add">
          Add items
        </a>
      </div>
    </section>
  );
}
