import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExamRunner from "./ExamRunner";
import { gradeAndSubmit } from "./actions";

interface RawQuestion {
  id: string;
  question_text: string;
  type: string;
  marks: number;
  negative_marks: number;
  options: { id: string; option_text: string }[];
}

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, exam_id, status, started_at, exams(title, duration_minutes, negative_marking, end_time, shuffle_questions, proctoring)")
    .eq("id", attemptId)
    .single();

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
  };

  const deadline = Math.min(
    new Date(attempt.started_at as string).getTime() + exam.duration_minutes * 60000,
    exam.end_time ? new Date(exam.end_time).getTime() : Infinity
  );

  if (Date.now() >= deadline) {
    await gradeAndSubmit(attemptId);
    redirect(`/student/attempt/${attemptId}/result`);
  }

  // Questions via secure RPC (correct answers VAGAR)
  const { data: questions } = await supabase.rpc("get_attempt_questions", {
    p_attempt_id: attemptId,
  });

  // Existing answers (resume mate)
  const { data: saved } = await supabase
    .from("answers")
    .select("question_id, selected_option_ids, text_answer, marked_for_review")
    .eq("attempt_id", attemptId);

  const initialAnswers: Record<string, string[]> = {};
  const initialTextAnswers: Record<string, string> = {};
  const initialFlags: Record<string, boolean> = {};
  saved?.forEach((a) => {
    initialAnswers[a.question_id] = (a.selected_option_ids as string[]) ?? [];
    if (a.text_answer) initialTextAnswers[a.question_id] = a.text_answer;
    if (a.marked_for_review) initialFlags[a.question_id] = true;
  });

  return (
    <ExamRunner
      attemptId={attemptId}
      title={exam.title}
      startedAt={attempt.started_at as string}
      durationMinutes={exam.duration_minutes}
      examEndTime={exam.end_time}
      negativeMarking={exam.negative_marking}
      shuffle={exam.shuffle_questions}
      proctoring={exam.proctoring}
      questions={(questions as RawQuestion[]) ?? []}
      initialAnswers={initialAnswers}
      initialTextAnswers={initialTextAnswers}
      initialFlags={initialFlags}
    />
  );
}
