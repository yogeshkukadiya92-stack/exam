import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ProgressAnswer } from "@/lib/exam-progress";

export async function readMonitorAnswers(examId: string, attemptId?: string) {
  const supabase = await createClient();
  const rows: (ProgressAnswer & { attempt_id: string })[] = [];
  // Supabase limits each response; paginate so later students never show false zeros.
  for (let offset = 0; ; offset += 1000) {
    let query = supabase.from("answers")
      .select("id, attempt_id, question_id, selected_option_ids, text_answer, marked_for_review, attempts!inner(exam_id)")
      .eq("attempts.exam_id", examId).order("id").range(offset, offset + 999);
    if (attemptId) query = query.eq("attempt_id", attemptId);
    const { data, error } = await query;
    if (error) throw new Error("Unable to load saved answers. Please refresh to retry.");
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function readMonitorQuestions(examId: string) {
  const supabase = await createClient();
  const rows: { id: string; question_text: string; type: string; position: number; options: { id: string; option_text: string }[] }[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("questions")
      .select("id, question_text, type, position, options(id, option_text)")
      .eq("exam_id", examId).order("position").order("id").range(offset, offset + 999);
    if (error) throw new Error("Unable to load exam questions.");
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}
