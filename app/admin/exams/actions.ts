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

function indiaDateTimeLocalToIso(value: string) {
  if (!value) return null;
  return new Date(`${value}:00+05:30`).toISOString();
}

function examModeFromForm(formData: FormData) {
  return formData.get("exam_mode") === "practical" ? "practical" : "standard";
}

function timerModeFromForm(formData: FormData, examMode: string) {
  if (examMode !== "practical") return "continuous";
  return formData.get("timer_mode") === "continuous" ? "continuous" : "pausable";
}

export async function createExam(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const title = (formData.get("title") as string)?.trim();
  const courseId = formData.get("course_id") as string;
  const batchId = formData.get("batch_id") as string;
  if (!title || !courseId || !batchId) return;

  const startRaw = formData.get("start_time") as string;
  const endRaw = formData.get("end_time") as string;
  const examMode = examModeFromForm(formData);
  const timerMode = timerModeFromForm(formData, examMode);

  await supabase.from("exams").insert({
    title,
    course_id: courseId,
    batch_id: batchId,
    exam_mode: examMode,
    timer_mode: timerMode,
    allow_case_navigation:
      examMode === "practical" ? formData.get("allow_case_navigation") === "on" : true,
    instructions: (formData.get("instructions") as string)?.trim() || null,
    duration_minutes: Number(formData.get("duration_minutes")) || 60,
    pass_marks: Number(formData.get("pass_marks")) || 0,
    negative_marking: formData.get("negative_marking") === "on",
    shuffle_questions: formData.get("shuffle_questions") === "on",
    proctoring: formData.get("proctoring") === "on",
    show_correct_answers: formData.get("show_correct_answers") === "on",
    show_explanations: formData.get("show_explanations") === "on",
    result_visible: formData.get("result_visible") === "on",
    max_attempts: Number(formData.get("max_attempts")) || 1,
    start_time: indiaDateTimeLocalToIso(startRaw),
    end_time: indiaDateTimeLocalToIso(endRaw),
    created_by: profile.id,
  });

  revalidatePath("/admin/exams");
}

export async function updateExam(formData: FormData): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const id = formData.get("id") as string;
    const title = (formData.get("title") as string)?.trim();
    const courseId = formData.get("course_id") as string;
    const batchId = formData.get("batch_id") as string;
    if (!id || !title || !courseId || !batchId) {
      return { ok: false, message: "Title, course, and batch are required." };
    }

    const startRaw = formData.get("start_time") as string;
    const endRaw = formData.get("end_time") as string;
    const examMode = examModeFromForm(formData);
    const timerMode = timerModeFromForm(formData, examMode);

    const { error } = await supabase
      .from("exams")
      .update({
        title,
        course_id: courseId,
        batch_id: batchId,
        exam_mode: examMode,
        timer_mode: timerMode,
        allow_case_navigation:
          examMode === "practical" ? formData.get("allow_case_navigation") === "on" : true,
        instructions: (formData.get("instructions") as string)?.trim() || null,
        duration_minutes: Number(formData.get("duration_minutes")) || 60,
        pass_marks: Number(formData.get("pass_marks")) || 0,
        negative_marking: formData.get("negative_marking") === "on",
        shuffle_questions: formData.get("shuffle_questions") === "on",
        proctoring: formData.get("proctoring") === "on",
        show_correct_answers: formData.get("show_correct_answers") === "on",
        show_explanations: formData.get("show_explanations") === "on",
        result_visible: formData.get("result_visible") === "on",
        max_attempts: Number(formData.get("max_attempts")) || 1,
        start_time: indiaDateTimeLocalToIso(startRaw),
        end_time: indiaDateTimeLocalToIso(endRaw),
      })
      .eq("id", id);

    if (error) {
      return { ok: false, message: `Exam save failed: ${toMessage(error, "Unknown error")}` };
    }

    revalidatePath("/admin/exams");
    return { ok: true, message: "Exam updated successfully." };
  } catch (error) {
    return {
      ok: false,
      message: toMessage(error, "Unable to save exam."),
    };
  }
}

// Soft delete: move the exam to Trash so it can be restored.
export async function deleteExam(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase
    .from("exams")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/exams");
  revalidatePath("/admin/exams/trash");
}

// Restore an exam from Trash.
export async function restoreExam(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("exams").update({ deleted_at: null }).eq("id", id);
  revalidatePath("/admin/exams");
  revalidatePath("/admin/exams/trash");
}

// Permanently delete an exam from Trash. This cannot be undone.
export async function permanentlyDeleteExam(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("exams").delete().eq("id", id);
  revalidatePath("/admin/exams/trash");
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
      exam_mode: source.exam_mode ?? "standard",
      timer_mode: source.timer_mode ?? "continuous",
      allow_case_navigation: source.allow_case_navigation ?? true,
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

  const caseStudyMap = new Map<string, string>();
  const { data: caseStudies } = await supabase
    .from("case_studies")
    .select("*")
    .eq("exam_id", examId)
    .order("position");

  if (caseStudies && caseStudies.length > 0) {
    for (const cs of caseStudies) {
      const { data: newCase } = await supabase
        .from("case_studies")
        .insert({
          exam_id: newExam.id,
          title: cs.title,
          content: cs.content,
          position: cs.position,
          created_by: profile.id,
        })
        .select("id")
        .single();

      if (newCase) caseStudyMap.set(cs.id as string, newCase.id as string);
    }
  }

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
          case_study_id: q.case_study_id
            ? caseStudyMap.get(q.case_study_id as string) ?? null
            : null,
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
