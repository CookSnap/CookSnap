"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY;

type Database = Record<string, never>;

function assertEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
}

export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  assertEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
  assertEnv(supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createBrowserClient<Database>(supabaseUrl!, supabaseAnonKey!);
}
