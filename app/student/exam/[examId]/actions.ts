"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function startAttempt(formData: FormData) {
  await requireStudent();
  const examId = formData.get("exam_id") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_attempt", {
    p_exam_id: examId,
  });

  if (error || !data) {
    redirect(
      `/student/exam/${examId}?error=` +
        encodeURIComponent(error?.message ?? "Could not start exam")
    );
  }

  redirect(`/student/attempt/${data}`);
}
