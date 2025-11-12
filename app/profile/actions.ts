"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, requireUserId } from "@/lib/supabase";

export async function updateProfileAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await requireUserId(supabase);

  const firstName = (formData.get("firstName")?.toString().trim() ?? "").slice(0, 100);
  const lastName = (formData.get("lastName")?.toString().trim() ?? "").slice(0, 100);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  await supabase.auth.updateUser({
    data: {
      first_name: firstName || null,
      last_name: lastName || null,
      full_name: fullName || null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
