"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveInstructions(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const examId = formData.get("exam_id") as string;
  if (!examId) {
    return { ok: false, message: "Exam id missing che." };
  }

  const raw = (formData.get("instructions") as string) ?? "";
  const instructions = raw.trim() || null;

  const { error } = await supabase
    .from("exams")
    .update({ instructions })
    .eq("id", examId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/admin/exams/${examId}/instructions`);
  revalidatePath("/admin/exams");
  return { ok: true, message: "Instructions save thai gaya." };
}
