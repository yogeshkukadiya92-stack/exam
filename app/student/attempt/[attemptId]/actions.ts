"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStudent } from "@/lib/auth";
import { gradeAndSubmit } from "@/lib/grade-attempt";
import { redirect } from "next/navigation";

export async function submitAttempt(attemptId: string, reason = "manual") {
  const profile = await requireStudent();

  try {
    // Verify the attempt belongs to this student before grading.
    const admin = createAdminClient();
    const { data: owner, error } = await admin
      .from("attempts")
      .select("student_id")
      .eq("id", attemptId)
      .maybeSingle();
    if (error) throw error;
    if (!owner || owner.student_id !== profile.id) {
      return { error: "Attempt not found." };
    }
    const studentReasons = ["manual", "duration_expired", "exam_window_expired", "tab_switch_limit"];
    await gradeAndSubmit(attemptId, studentReasons.includes(reason) ? reason : "manual");
    return { error: null };
  } catch (e) {
    console.error("submitAttempt failed:", e instanceof Error ? e.message : e, { attemptId });
    return { error: "Unable to submit the exam. Please try again." };
  }
}

export async function pauseAttempt(attemptId: string) {
  const profile = await requireStudent();
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, exam_id, status")
    .eq("id", attemptId)
    .eq("student_id", profile.id)
    .maybeSingle();

  if (!attempt || attempt.status !== "in_progress") {
    redirect("/student");
  }

  const now = new Date().toISOString();
  await supabase
    .from("attempt_sessions")
    .update({ ended_at: now, last_seen_at: now })
    .eq("attempt_id", attemptId)
    .is("ended_at", null);

  redirect(`/student/exam/${attempt.exam_id}`);
}
