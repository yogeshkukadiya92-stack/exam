"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createAnnouncement(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const title = (formData.get("title") as string)?.trim();
  const content = (formData.get("content") as string)?.trim() || null;
  if (!title) return;

  await supabase.from("announcements").insert({
    title,
    content,
    created_by: profile.id,
  });

  revalidatePath("/admin/announcements");
}

export async function deleteAnnouncement(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);
  revalidatePath("/admin/announcements");
}

export async function toggleAnnouncement(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const active = formData.get("is_active") === "true";
  const supabase = await createClient();
  await supabase
    .from("announcements")
    .update({ is_active: !active })
    .eq("id", id);
  revalidatePath("/admin/announcements");
}
