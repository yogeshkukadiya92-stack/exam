"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function toMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const details = error as { message?: unknown; code?: unknown; details?: unknown };
    const parts = [
      typeof details.message === "string" ? details.message : null,
      details.code ? `code: ${String(details.code)}` : null,
      details.details ? String(details.details) : null,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(" | ");
  }
  return fallback;
}

export async function addQuestion(formData: FormData): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const examId = formData.get("exam_id") as string;
    const questionText = (formData.get("question_text") as string)?.trim();
    const type = (formData.get("type") as string) || "single";
    const marks = Number(formData.get("marks")) || 1;
    const negativeMarks = Number(formData.get("negative_marks")) || 0;
    const explanation = (formData.get("explanation") as string)?.trim() || null;

    if (!examId || !questionText) {
      return { ok: false, message: "Question text required chhe." };
    }

    // Options aave che: option_0..option_3, correct_0..correct_3
    const options: { option_text: string; is_correct: boolean; position: number }[] =
      [];
    for (let i = 0; i < 4; i++) {
      const text = (formData.get(`option_${i}`) as string)?.trim();
      if (!text) continue;
      options.push({
        option_text: text,
        is_correct: formData.get(`correct_${i}`) === "on",
        position: i,
      });
    }

    if (options.length < 2) {
      return { ok: false, message: "Ochama 2 options add karo." };
    }
    if (!options.some((o) => o.is_correct)) {
      return { ok: false, message: "Ochama 1 correct option select karo." };
    }

    // 1) question insert
    const { data: q, error } = await supabase
      .from("questions")
      .insert({
        exam_id: examId,
        type,
        question_text: questionText,
        marks,
        negative_marks: negativeMarks,
        explanation,
      })
      .select("id")
      .single();

    if (error || !q) {
      return {
        ok: false,
        message: `Question save fail: ${toMessage(error, "Unknown error")}`,
      };
    }

    // 2) options insert
    const { error: optionsError } = await supabase
      .from("options")
      .insert(options.map((o) => ({ ...o, question_id: q.id })));

    if (optionsError) {
      await supabase.from("questions").delete().eq("id", q.id);
      return {
        ok: false,
        message: `Options save fail: ${toMessage(optionsError, "Unknown error")}`,
      };
    }

    revalidatePath(`/admin/exams/${examId}/questions`);
    return { ok: true, message: "Question add thai gayo." };
  } catch (error) {
    return {
      ok: false,
      message: toMessage(error, "Question add karva ma problem aavi."),
    };
  }
}

interface BulkQuestion {
  question_text: string;
  options: string[];
  correct: number[];
  marks: number;
  negative_marks: number;
  type: "single" | "multiple";
}

export async function bulkAddQuestions(
  examId: string,
  questions: BulkQuestion[]
): Promise<{ added: number; failed: number }> {
  await requireAdmin();
  const supabase = await createClient();

  let added = 0;
  let failed = 0;

  for (const q of questions) {
    if (!q.question_text || q.options.length < 2 || q.correct.length === 0) {
      failed++;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("questions")
      .insert({
        exam_id: examId,
        type: q.type,
        question_text: q.question_text,
        marks: q.marks,
        negative_marks: q.negative_marks,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      failed++;
      continue;
    }

    const optionRows = q.options.map((text, i) => ({
      question_id: inserted.id,
      option_text: text,
      is_correct: q.correct.includes(i),
      position: i,
    }));

    const { error: optErr } = await supabase.from("options").insert(optionRows);
    if (optErr) failed++;
    else added++;
  }

  revalidatePath(`/admin/exams/${examId}/questions`);
  return { added, failed };
}

export async function deleteQuestion(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const examId = formData.get("exam_id") as string;
  const supabase = await createClient();
  await supabase.from("questions").delete().eq("id", id);
  revalidatePath(`/admin/exams/${examId}/questions`);
}
