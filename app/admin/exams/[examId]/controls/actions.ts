"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function grantExtraAttempt(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const examId = formData.get("exam_id") as string;
  const studentId = formData.get("student_id") as string;
  if (!examId || !studentId) return;

  await supabase.from("student_exam_overrides").upsert(
    {
      exam_id: examId,
      student_id: studentId,
      extra_attempts: Number(formData.get("extra_attempts")) || 1,
      notes: (formData.get("notes") as string)?.trim() || null,
      created_by: profile.id,
    },
    { onConflict: "exam_id,student_id" }
  );
  revalidatePath(`/admin/exams/${examId}/controls`);
}

export async function resetAttempt(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const examId = formData.get("exam_id") as string;
  const attemptId = formData.get("attempt_id") as string;
  if (!attemptId) return;

  await supabase
    .from("attempts")
    .update({
      status: "submitted",
      reset_by: profile.id,
      reset_at: new Date().toISOString(),
    })
    .eq("id", attemptId);
  revalidatePath(`/admin/exams/${examId}/controls`);
}
