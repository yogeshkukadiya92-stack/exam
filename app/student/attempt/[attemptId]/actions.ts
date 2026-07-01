"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStudent } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function submitAttempt(attemptId: string) {
  const profile = await requireStudent();

  try {
    // Verify the attempt belongs to this student before grading.
    const admin = createAdminClient();
    const { data: owner } = await admin
      .from("attempts")
      .select("student_id")
      .eq("id", attemptId)
      .maybeSingle();

    if (owner && owner.student_id === profile.id) {
      const now = new Date().toISOString();
      await admin
        .from("attempt_sessions")
        .update({ ended_at: now, last_seen_at: now })
        .eq("attempt_id", attemptId)
        .is("ended_at", null);
      await gradeAndSubmit(attemptId);
    }
  } catch (e) {
    console.error("submitAttempt failed:", e instanceof Error ? e.message : e, { attemptId });
    // Last resort: at least mark it submitted so it isn't stuck "in progress".
    try {
      const supabase = await createClient();
      await supabase
        .from("attempts")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", attemptId)
        .eq("student_id", profile.id);
    } catch {
      // ignore — we still redirect to the result page below
    }
  }

  redirect(`/student/attempt/${attemptId}/result`);
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

interface QuestionRow {
  id: string;
  type: string;
  marks: number | null;
  negative_marks: number | null;
  correct_text: string | null;
}

/**
 * Grade an in-progress attempt and mark it submitted.
 * Runs with the service-role client so it can read option correctness
 * (which is RLS-locked for students) — independent of any DB RPC.
 */
export async function gradeAndSubmit(attemptId: string) {
  const admin = createAdminClient();

  const { data: attempt } = await admin
    .from("attempts")
    .select("id, exam_id, status")
    .eq("id", attemptId)
    .maybeSingle();

  if (!attempt || attempt.status !== "in_progress") return; // already submitted / missing

  const examId = attempt.exam_id as string;
  const now = new Date().toISOString();

  await admin
    .from("attempt_sessions")
    .update({ ended_at: now, last_seen_at: now })
    .eq("attempt_id", attemptId)
    .is("ended_at", null);

  const [{ data: exam }, { data: questions }, { data: answers }] = await Promise.all([
    admin.from("exams").select("negative_marking").eq("id", examId).maybeSingle(),
    admin
      .from("questions")
      .select("id, type, marks, negative_marks, correct_text")
      .eq("exam_id", examId),
    admin
      .from("answers")
      .select("question_id, selected_option_ids, text_answer")
      .eq("attempt_id", attemptId),
  ]);

  const negativeMarking = !!exam?.negative_marking;
  const qList = (questions as QuestionRow[]) ?? [];
  const qIds = qList.map((q) => q.id);

  const { data: options } = qIds.length
    ? await admin
        .from("options")
        .select("question_id, id, is_correct")
        .in("question_id", qIds)
    : { data: [] as { question_id: string; id: string; is_correct: boolean }[] };

  // correct option ids per question
  const correctByQ = new Map<string, Set<string>>();
  ((options as { question_id: string; id: string; is_correct: boolean }[]) ?? []).forEach((o) => {
    if (!o.is_correct) return;
    const set = correctByQ.get(o.question_id) ?? new Set<string>();
    set.add(o.id);
    correctByQ.set(o.question_id, set);
  });

  const answerByQ = new Map<string, { selected_option_ids: string[] | null; text_answer: string | null }>(
    ((answers as { question_id: string; selected_option_ids: string[] | null; text_answer: string | null }[]) ?? []).map(
      (a) => [a.question_id, a]
    )
  );

  const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
  const setsEqual = (a: Set<string>, b: string[]) =>
    a.size === b.length && b.every((x) => a.has(x));

  let total = 0;
  const updates: PromiseLike<unknown>[] = [];

  for (const q of qList) {
    const ans = answerByQ.get(q.id);
    const marks = Number(q.marks) || 0;
    const neg = Number(q.negative_marks) || 0;

    let score: number | null;
    let isCorrect: boolean | null;

    if (q.type === "single" || q.type === "multiple" || q.type === "true_false") {
      const selected = ans?.selected_option_ids ?? [];
      const correct = correctByQ.get(q.id) ?? new Set<string>();
      if (selected.length === 0) {
        score = 0;
        isCorrect = null;
      } else if (correct.size > 0 && setsEqual(correct, selected)) {
        score = marks;
        isCorrect = true;
      } else {
        isCorrect = false;
        score = negativeMarking ? -neg : 0;
      }
    } else if (q.type === "fill_blank" || q.type === "numerical") {
      const text = ans?.text_answer ?? "";
      if (norm(text) === "") {
        score = 0;
        isCorrect = null;
      } else if (norm(text) === norm(q.correct_text)) {
        score = marks;
        isCorrect = true;
      } else {
        isCorrect = false;
        score = negativeMarking ? -neg : 0;
      }
    } else {
      // descriptive — manual grading
      score = null;
      isCorrect = null;
    }

    total += score ?? 0;

    // Only update rows that exist (skipped questions may have no answer row).
    if (ans) {
      updates.push(
        admin
          .from("answers")
          .update({ is_correct: isCorrect, score })
          .eq("attempt_id", attemptId)
          .eq("question_id", q.id)
      );
    }
  }

  await Promise.all(updates);

  const hasDescriptive = qList.some((q) => q.type === "descriptive");

  await admin
    .from("attempts")
    .update({
      status: hasDescriptive ? "submitted" : "graded",
      submitted_at: new Date().toISOString(),
      total_score: total,
    })
    .eq("id", attemptId);
}
