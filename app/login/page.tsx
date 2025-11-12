"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const supabase = createSupabaseBrowserClient();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleGoogle = () => {
    setError(null);
    startTransition(async () => {
      const callbackUrl = new URL("/auth/callback", location.origin);
      callbackUrl.searchParams.set("next", "/thanks");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl.toString() },
      });
      if (error) setError(error.message);
    });
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--accent))]/15 p-8 text-sm text-[rgb(var(--muted-foreground))]">
      <h1 className="text-2xl font-semibold text-[rgb(var(--foreground))]">Sign in</h1>
      <p className="text-sm text-[rgb(var(--muted-foreground))]">
        Enable Google under Supabase Auth → Providers, add {`{origin}/auth/callback`} to the redirect list, then sign in below.
      </p>
      <Button onClick={handleGoogle} disabled={pending} className="h-12 w-full text-base font-semibold">
        {pending ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <p className="text-xs text-[rgb(var(--muted-foreground))]">
        Need magic-link instead? Trigger it via the Supabase dashboard—it’ll work with the same session cookies.
      </p>
    </div>
  );
}
