"use server";

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated", authError });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    authUserId: user.id,
    authEmail: user.email,
    profile,
    profileError,
  });
}
