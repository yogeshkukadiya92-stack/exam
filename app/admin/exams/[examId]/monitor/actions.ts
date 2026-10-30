"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gradeAndSubmit } from "@/lib/grade-attempt";
import { revalidatePath } from "next/cache";

export async function adminSubmitAttempt(examId: string, attemptId: string) {
  await requireAdmin();
  const supabase = await createClient();
  // Verify both exam access and attempt membership before service-role grading.
  const { data: attempt, error } = await supabase.from("attempts")
    .select("id, status, exams!inner(id)").eq("id", attemptId).eq("exam_id", examId).maybeSingle();
  if (error || !attempt) return { error: "This attempt could not be found or accessed." };
  if (attempt.status !== "in_progress") return { error: "This attempt has already been submitted." };
  try {
    await gradeAndSubmit(attemptId, "admin_submitted");
    revalidatePath(`/admin/exams/${examId}/monitor`);
    revalidatePath(`/admin/exams/${examId}/results`);
    revalidatePath(`/student/attempt/${attemptId}`);
    return { error: null };
  } catch (error) {
    console.error("Admin submission failed", { attemptId, error });
    return { error: "Submission could not be completed. Refresh the status before trying again." };
  }
}
