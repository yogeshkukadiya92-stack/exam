"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function queueNotification(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();
  await supabase.from("notification_events").insert({
    event_type: (formData.get("event_type") as string) || "manual",
    recipient: (formData.get("recipient") as string)?.trim() || null,
    subject: (formData.get("subject") as string)?.trim() || null,
    body: (formData.get("body") as string)?.trim() || null,
    status: "queued",
    created_by: profile.id,
  });
  revalidatePath("/admin/notifications");
}
