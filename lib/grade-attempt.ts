import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

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
export async function gradeAndSubmit(attemptId: string, reason = "manual") {
  const admin = createAdminClient();

  const { data: attempt, error: attemptError } = await admin
    .from("attempts")
    .select("id, exam_id, status")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptError) throw attemptError;
  if (!attempt) throw new Error("Attempt not found");
  if (attempt.status !== "in_progress") return; // already submitted

  const examId = attempt.exam_id as string;
  const now = new Date().toISOString();

  await admin
    .from("attempt_sessions")
    .update({ ended_at: now, last_seen_at: now })
    .eq("attempt_id", attemptId)
    .is("ended_at", null);

  const [{ data: exam, error: examError }, { data: questions, error: questionsError }, { data: answers, error: answersError }] = await Promise.all([
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

  if (examError || questionsError || answersError) throw examError || questionsError || answersError;
  if (!exam || !questions?.length) throw new Error("Exam questions unavailable");

  const negativeMarking = !!exam?.negative_marking;
  const qList = (questions as QuestionRow[]) ?? [];
  const qIds = qList.map((q) => q.id);

  const { data: options, error: optionsError } = qIds.length
    ? await admin
        .from("options")
        .select("question_id, id, is_correct")
        .in("question_id", qIds)
    : { data: [] as { question_id: string; id: string; is_correct: boolean }[], error: null };
  if (optionsError) throw optionsError;

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
  const updates: PromiseLike<{ error: { message: string } | null }>[] = [];

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

  const results = await Promise.all(updates);
  const gradingError = results.find((result) => result.error)?.error;
  if (gradingError) throw new Error(gradingError.message);

  const hasDescriptive = qList.some((q) => q.type === "descriptive");

  const submission = {
    status: hasDescriptive ? "submitted" : "graded",
    submitted_at: new Date().toISOString(),
    total_score: total,
  };
  const allowedReasons = ["manual", "duration_expired", "exam_window_expired", "tab_switch_limit", "admin_submitted"];
  const { error: submissionError } = await admin
    .from("attempts")
    .update({
      ...submission,
      submission_reason: allowedReasons.includes(reason) ? reason : "manual",
    })
    .eq("id", attemptId)
    .eq("status", "in_progress");
  // Deploy compatibility: a missing diagnostics migration must not lose a grade.
  if (submissionError) {
    console.error("Submission diagnostics failed", submissionError.message);
    const { error } = await admin.from("attempts").update(submission)
      .eq("id", attemptId).eq("status", "in_progress");
    if (error) throw new Error(error.message);
  }
}
