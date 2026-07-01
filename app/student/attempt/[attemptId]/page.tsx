import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExamRunner from "./ExamRunner";
import { gradeAndSubmit } from "./actions";

interface RawQuestion {
  id: string;
  case_study_id: string | null;
  case_study: {
    id: string;
    title: string;
    content: string;
    position: number | null;
  } | null;
  question_text: string;
  type: string;
  marks: number;
  negative_marks: number;
  options: { id: string; option_text: string }[];
}

interface SavedAnswerRow {
  question_id: string;
  selected_option_ids: string[] | null;
  text_answer: string | null;
  marked_for_review: boolean | null;
}

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();

  const attemptQuery = await supabase
    .from("attempts")
    .select("id, exam_id, status, started_at, exams(title, duration_minutes, negative_marking, end_time, shuffle_questions, proctoring, exam_mode, timer_mode, allow_case_navigation)")
    .eq("id", attemptId)
    .single();
  const fallbackAttemptQuery = attemptQuery.error
    ? await supabase
        .from("attempts")
        .select("id, exam_id, status, started_at, exams(title, duration_minutes, negative_marking, end_time, shuffle_questions, proctoring)")
        .eq("id", attemptId)
        .single()
    : null;
  const attempt = attemptQuery.data ?? fallbackAttemptQuery?.data;

  if (!attempt) notFound();
  if (attempt.status !== "in_progress") {
    redirect(`/student/attempt/${attemptId}/result`);
  }

  const exam = attempt.exams as unknown as {
    title: string;
    duration_minutes: number;
    negative_marking: boolean;
    end_time: string | null;
    shuffle_questions: boolean;
    proctoring: boolean;
    exam_mode?: string | null;
    timer_mode?: string | null;
    allow_case_navigation?: boolean | null;
  };

  const isPausablePractical =
    exam.exam_mode === "practical" && exam.timer_mode === "pausable";
  const windowDeadline = exam.end_time ? new Date(exam.end_time).getTime() : Infinity;
  const continuousDeadline = Math.min(
    new Date(attempt.started_at as string).getTime() + exam.duration_minutes * 60000,
    windowDeadline
  );

  if (!isPausablePractical && Date.now() >= continuousDeadline) {
    await gradeAndSubmit(attemptId);
    redirect(`/student/attempt/${attemptId}/result`);
  }

  const activeSecondsPromise = isPausablePractical
    ? supabase.rpc("get_attempt_active_seconds", { p_attempt_id: attemptId })
    : Promise.resolve({ data: 0 });

  const [{ data: activeSeconds }, { data: questions }, { data: saved }] =
    await Promise.all([
      activeSecondsPromise,
      supabase.rpc("get_attempt_questions", {
        p_attempt_id: attemptId,
      }),
      supabase
        .from("answers")
        .select("question_id, selected_option_ids, text_answer, marked_for_review")
        .eq("attempt_id", attemptId),
    ]);

  const initialActiveSeconds = Math.max(0, Number(activeSeconds) || 0);

  if (
    (isPausablePractical && initialActiveSeconds >= exam.duration_minutes * 60) ||
    Date.now() >= windowDeadline
  ) {
    await gradeAndSubmit(attemptId);
    redirect(`/student/attempt/${attemptId}/result`);
  }

  const initialAnswers: Record<string, string[]> = {};
  const initialTextAnswers: Record<string, string> = {};
  const initialFlags: Record<string, boolean> = {};
  (saved as SavedAnswerRow[] | null)?.forEach((a) => {
    initialAnswers[a.question_id] = (a.selected_option_ids as string[]) ?? [];
    if (a.text_answer) initialTextAnswers[a.question_id] = a.text_answer;
    if (a.marked_for_review) initialFlags[a.question_id] = true;
  });

  // Break out of the student layout's max-w-4xl container so the exam uses
  // the full screen width on desktop (more room for question + palette).
  return (
    <div className="mx-[calc(50%-50vw)] w-screen px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <ExamRunner
          attemptId={attemptId}
          title={exam.title}
          examMode={exam.exam_mode ?? "standard"}
          timerMode={exam.timer_mode ?? "continuous"}
          allowCaseNavigation={exam.allow_case_navigation ?? true}
          startedAt={attempt.started_at as string}
          durationMinutes={exam.duration_minutes}
          examEndTime={exam.end_time}
          initialActiveSeconds={initialActiveSeconds}
          negativeMarking={exam.negative_marking}
          shuffle={exam.shuffle_questions}
          proctoring={exam.proctoring}
          questions={(questions as RawQuestion[]) ?? []}
          initialAnswers={initialAnswers}
          initialTextAnswers={initialTextAnswers}
          initialFlags={initialFlags}
        />
      </div>
    </div>
  );
}
