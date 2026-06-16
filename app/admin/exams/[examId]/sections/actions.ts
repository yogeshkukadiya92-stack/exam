"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addSection(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const examId = formData.get("exam_id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!examId || !name) return;

  await supabase.from("sections").insert({
    exam_id: examId,
    name,
    position: Number(formData.get("position")) || 0,
    marks: Number(formData.get("marks")) || 0,
    duration_minutes: Number(formData.get("duration_minutes")) || null,
  });
  revalidatePath(`/admin/exams/${examId}/sections`);
}

export async function deleteSection(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const examId = formData.get("exam_id") as string;
  const id = formData.get("id") as string;
  await supabase.from("sections").delete().eq("id", id);
  revalidatePath(`/admin/exams/${examId}/sections`);
}
