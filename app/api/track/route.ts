import { NextResponse } from "next/server";
import { createSupabaseRouteClient, requireUserId } from "@/lib/supabase";

export async function POST(request: Request) {
  const supabase = await createSupabaseRouteClient();
  let userId: string;
  try {
    userId = await requireUserId(supabase);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }
  const body = await request.json();

  if (!body.event) {
    return NextResponse.json({ error: "Missing event name" }, { status: 400 });
  }

  const { error } = await supabase.from("events").insert({
    user_id: userId,
    type: body.event,
    payload: body.payload ?? {},
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
