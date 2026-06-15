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

  // Already submitted athva error — banne kisse result page par moklo
  if (error) {
    console.error("submit_attempt:", error.message);
  }

  redirect(`/student/attempt/${attemptId}/result`);
}
