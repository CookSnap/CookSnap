"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

const HIGHLIGHT_MESSAGES = [
  "200k+ free recipes tailored to whatever's already in your pantry.",
  "Use-it-now alerts so you cook ingredients before they go bad.",
  "Scan barcodes or receipts to auto-stock your pantry and shopping list.",
  "Share shopping lists and pantry updates with the whole household.",
];

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(
      () => setHighlightIndex((index) => (index + 1) % HIGHLIGHT_MESSAGES.length),
      2400,
    );
    return () => window.clearInterval(interval);
  }, []);

  const getSiteUrl = () => {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  };

  const handleGoogle = () => {
    setError(null);
    startTransition(async () => {
      const callbackUrl = new URL("/auth/callback", getSiteUrl());
      callbackUrl.searchParams.set("next", "/thanks");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl.toString() },
      });
      if (error) setError(error.message);
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/15 p-8 text-sm text-[rgb(var(--muted-foreground))] shadow-lg">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">Welcome back</p>
        <h1 className="text-3xl font-semibold text-[rgb(var(--foreground))]">Sign in to CookSnap</h1>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">Sync your pantry, recipes, and shopping list across every device.</p>
      </div>
      <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/10 p-4">
        <p className="text-xs uppercase tracking-wide text-[rgb(var(--muted-foreground))]">Why CookSnap</p>
        <p className="mt-1 text-sm font-medium text-[rgb(var(--foreground))]">{HIGHLIGHT_MESSAGES[highlightIndex]}</p>
      </div>
      <Button onClick={handleGoogle} disabled={pending} className="h-12 w-full text-base font-semibold">
        {pending ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <p className="text-xs text-[rgb(var(--muted-foreground))]">Single sign-on powered by Google. No passwords to forget.</p>
    </div>
  );
}
