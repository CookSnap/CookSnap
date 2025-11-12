import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseServerClient, requireUserId } from "@/lib/supabase";
import { logoutAction, updateProfileAction } from "./actions";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  await requireUserId(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName =
    (user?.user_metadata?.first_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")?.[0] ??
    "";
  const lastName =
    (user?.user_metadata?.last_name as string | undefined) ??
    (() => {
      const full = (user?.user_metadata?.full_name as string | undefined) ?? "";
      const parts = full.split(" ");
      return parts.length > 1 ? parts.slice(1).join(" ") : "";
    })() ??
    "";
  const email = user?.email ?? "";

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">Profile</p>
        <h1 className="text-3xl font-semibold">Household identity</h1>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">Update how CookSnap greets you or sign out of this device.</p>
      </header>
      <section className="rounded-3xl border border-[rgb(var(--border))]/60 p-6">
        <form action={updateProfileAction} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" name="firstName" defaultValue={firstName} placeholder="Taylor" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" defaultValue={lastName} placeholder="Nguyen" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={email} disabled className="opacity-70" />
          </div>
          <Button type="submit">Save changes</Button>
        </form>
      </section>
      <section className="rounded-3xl border border-[rgb(var(--border))]/60 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Log out</h2>
            <p className="text-sm text-[rgb(var(--muted-foreground))]">Sign out everywhere on this browser.</p>
          </div>
          <form action={logoutAction}>
            <Button variant="outline">Log out</Button>
          </form>
        </div>
      </section>
    </div>
  );
}
