"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function submitAttempt(attemptId: string) {
  await requireStudent();
  const supabase = await createClient();

  const { error } = await supabase.rpc("submit_attempt", {
    p_attempt_id: attemptId,
  });

  // "Already submitted" jevo error ignore karo — attempt pehlethi submit thai gayo hoy.
  // Bija errors log karo (Railway logs ma dekhase) jethi diagnose thai shake.
  if (error && !/already submitted|not found/i.test(error.message)) {
    console.error("submit_attempt failed:", error.message, { attemptId });
  }

  redirect(`/student/attempt/${attemptId}/result`);
}
