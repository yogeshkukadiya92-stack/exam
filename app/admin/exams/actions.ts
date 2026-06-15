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

export async function duplicateExam(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const examId = formData.get("exam_id") as string;
  const targetBatchId = (formData.get("batch_id") as string) || null;

  const { data: source } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .single();
  if (!source) return;

  const { data: newExam } = await supabase
    .from("exams")
    .insert({
      title: source.title + " (Copy)",
      course_id: source.course_id,
      batch_id: targetBatchId || source.batch_id,
      instructions: source.instructions,
      duration_minutes: source.duration_minutes,
      pass_marks: source.pass_marks,
      negative_marking: source.negative_marking,
      shuffle_questions: source.shuffle_questions,
      max_attempts: source.max_attempts,
      start_time: null,
      end_time: null,
      is_published: false,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (!newExam) return;

  const { data: questions } = await supabase
    .from("questions")
    .select("*, options(*)")
    .eq("exam_id", examId);

  if (questions) {
    for (const q of questions) {
      const opts = (q.options ?? []) as {
        option_text: string;
        is_correct: boolean;
        position: number;
      }[];

      const { data: newQ } = await supabase
        .from("questions")
        .insert({
          exam_id: newExam.id,
          section_id: null,
          type: q.type,
          question_text: q.question_text,
          image_url: q.image_url,
          marks: q.marks,
          negative_marks: q.negative_marks,
          difficulty: q.difficulty,
          topic: q.topic,
          explanation: q.explanation,
          correct_text: q.correct_text,
          position: q.position,
        })
        .select("id")
        .single();

      if (newQ && opts.length > 0) {
        await supabase.from("options").insert(
          opts.map((o) => ({
            question_id: newQ.id,
            option_text: o.option_text,
            is_correct: o.is_correct,
            position: o.position,
          }))
        );
      }
    }
  }

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
