"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateSettings(formData: FormData) {
  await requireSuperAdmin();
  const supabase = await createClient();

  const name = (formData.get("name") as string)?.trim() || "ExamHub";
  const tagline = (formData.get("tagline") as string)?.trim() || "";
  const logo_url = (formData.get("logo_url") as string)?.trim() || null;
  const primary_color = (formData.get("primary_color") as string)?.trim() || "#4f46e5";
  const footer_text = (formData.get("footer_text") as string)?.trim() || null;
  const website_url = (formData.get("website_url") as string)?.trim() || null;
  const support_email = (formData.get("support_email") as string)?.trim() || null;

  const { data: existing } = await supabase
    .from("academy_settings")
    .select("id")
    .limit(1)
    .single();

  if (existing) {
    await supabase
      .from("academy_settings")
      .update({ name, tagline, logo_url, primary_color, footer_text, website_url, support_email })
      .eq("id", existing.id);
  }

  revalidatePath("/", "layout");
}
