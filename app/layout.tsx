import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TopNavLinks } from "@/components/TopNavLinks";
import { createSupabaseServerClient } from "@/lib/supabase";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "CookSnap",
  description: "Effortless power for every pantry.",
  icons: {
    icon: [
      { url: "/favicon.svg", sizes: "any" },
      { url: "/favicon.svg", rel: "shortcut icon" },
    ],
    apple: "/favicon.svg",
  },
};

const themeScript = `
(function() {
  const stored = window.localStorage.getItem('cooksnap-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = stored ?? (prefersDark ? 'dark' : 'light');
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? null;

  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/correctness/useUniqueElementIds: Next.js inline script requires a stable id */}
        <Script id="theme-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="relative flex min-h-screen flex-col bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
        <header className="sticky top-0 z-50 border-b border-[rgb(var(--border))]/70 bg-[rgb(var(--background))]/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-4 text-base font-semibold uppercase tracking-[0.35em] text-[rgb(var(--muted-foreground))] dark:text-white/80 md:text-lg">
              <Image src="/favicon.svg" alt="CookSnap logo" width={60} height={60} priority className="bg-[rgb(var(--background))] shadow-md" />
              CookSnap
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <TopNavLinks displayName={displayName} />
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="mx-auto flex max-w-6xl flex-1 flex-col gap-8 px-4 py-10 pb-24">{children}</main>
        <footer className="border-t border-[rgb(var(--border))]/60 bg-[rgb(var(--accent))]/10 py-6 text-center text-xs text-[rgb(var(--muted-foreground))] dark:text-white/70">
          Built for households that flex. Effortless power.
        </footer>
      </body>
    </html>
  );
}
