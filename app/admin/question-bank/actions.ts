"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addBankQuestion(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const questionText = (formData.get("question_text") as string)?.trim();
  const type = (formData.get("type") as string) || "single";
  if (!questionText) return;

  const { data: question } = await supabase
    .from("question_bank")
    .insert({
      subject: (formData.get("subject") as string)?.trim() || null,
      topic: (formData.get("topic") as string)?.trim() || null,
      difficulty: (formData.get("difficulty") as string) || null,
      type,
      question_text: questionText,
      marks: Number(formData.get("marks")) || 1,
      negative_marks: Number(formData.get("negative_marks")) || 0,
      correct_text: (formData.get("correct_text") as string)?.trim() || null,
      explanation: (formData.get("explanation") as string)?.trim() || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (!question) return;

  const optionRows = [];
  for (let i = 0; i < 4; i++) {
    const text = (formData.get(`option_${i}`) as string)?.trim();
    if (!text) continue;
    optionRows.push({
      bank_question_id: question.id,
      option_text: text,
      is_correct: formData.get(`correct_${i}`) === "on",
      position: i,
    });
  }

  if (optionRows.length > 0) {
    await supabase.from("question_bank_options").insert(optionRows);
  }

  revalidatePath("/admin/question-bank");
}

export async function deleteBankQuestion(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("question_bank").delete().eq("id", id);
  revalidatePath("/admin/question-bank");
}

export async function addBankQuestionsToExam(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const examId = formData.get("exam_id") as string;
  const ids = formData.getAll("question_ids").map(String);
  if (!examId || ids.length === 0) return;

  const { data: bankQuestions } = await supabase
    .from("question_bank")
    .select("*, question_bank_options(*)")
    .in("id", ids);

  if (!bankQuestions) return;

  for (const q of bankQuestions) {
    const { data: inserted } = await supabase
      .from("questions")
      .insert({
        exam_id: examId,
        source_question_id: q.id,
        type: q.type,
        question_text: q.question_text,
        image_url: q.image_url,
        marks: q.marks,
        negative_marks: q.negative_marks,
        difficulty: q.difficulty,
        topic: q.topic,
        subject: q.subject,
        explanation: q.explanation,
        correct_text: q.correct_text,
      })
      .select("id")
      .single();

    const options = (q.question_bank_options ?? []) as {
      option_text: string;
      is_correct: boolean;
      position: number;
    }[];

    if (inserted && options.length > 0) {
      await supabase.from("options").insert(
        options.map((o) => ({
          question_id: inserted.id,
          option_text: o.option_text,
          is_correct: o.is_correct,
          position: o.position,
        }))
      );
    }
  }

  revalidatePath(`/admin/exams/${examId}/questions`);
}
