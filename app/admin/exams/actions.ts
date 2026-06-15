"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createExam(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const title = (formData.get("title") as string)?.trim();
  const courseId = formData.get("course_id") as string;
  const batchId = formData.get("batch_id") as string;
  if (!title || !courseId || !batchId) return;

  const startRaw = formData.get("start_time") as string;
  const endRaw = formData.get("end_time") as string;

  await supabase.from("exams").insert({
    title,
    course_id: courseId,
    batch_id: batchId,
    instructions: (formData.get("instructions") as string)?.trim() || null,
    duration_minutes: Number(formData.get("duration_minutes")) || 60,
    pass_marks: Number(formData.get("pass_marks")) || 0,
    negative_marking: formData.get("negative_marking") === "on",
    shuffle_questions: formData.get("shuffle_questions") === "on",
    proctoring: formData.get("proctoring") === "on",
    max_attempts: Number(formData.get("max_attempts")) || 1,
    start_time: startRaw ? new Date(startRaw).toISOString() : null,
    end_time: endRaw ? new Date(endRaw).toISOString() : null,
    created_by: profile.id,
  });

  revalidatePath("/admin/exams");
}

export async function deleteExam(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("exams").delete().eq("id", id);
  revalidatePath("/admin/exams");
}

export async function togglePublish(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const publish = formData.get("publish") === "true";
  const supabase = await createClient();
  await supabase.from("exams").update({ is_published: publish }).eq("id", id);
  revalidatePath("/admin/exams");
}
