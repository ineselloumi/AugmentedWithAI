import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("trending_cache")
    .select("data")
    .eq("id", 1)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "no_data" }, { status: 503 });
  }

  return NextResponse.json(data.data);
}
