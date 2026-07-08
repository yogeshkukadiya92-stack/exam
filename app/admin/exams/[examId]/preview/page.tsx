import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ExamRunner from "@/app/student/attempt/[attemptId]/ExamRunner";

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
  options: { id: string; option_text: string; position?: number | null }[];
}

export default async function ExamPreviewPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select(
      "id, title, duration_minutes, negative_marking, end_time, shuffle_questions, proctoring, exam_mode, timer_mode, allow_case_navigation, deleted_at"
    )
    .eq("id", examId)
    .maybeSingle();

  if (!exam || exam.deleted_at) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select(
      "id, case_study_id, case_study:case_studies(id, title, content, position), question_text, type, marks, negative_marks, position, options(id, option_text, position)"
    )
    .eq("exam_id", examId)
    .order("position", { ascending: true });

  const previewQuestions = ((questions as RawQuestion[] | null) ?? []).map((question) => ({
    ...question,
    options: [...(question.options ?? [])].sort(
      (a, b) => Number(a.position ?? 0) - Number(b.position ?? 0)
    ),
  }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/exams" className="btn-secondary inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to exams
        </Link>
        <span className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Admin test preview
        </span>
      </div>

      <div className="mx-auto max-w-6xl">
        <ExamRunner
          attemptId={`preview-${exam.id}`}
          title={exam.title}
          examMode={exam.exam_mode ?? "standard"}
          timerMode={exam.timer_mode ?? "continuous"}
          allowCaseNavigation={exam.allow_case_navigation ?? true}
          startedAt={new Date().toISOString()}
          durationMinutes={exam.duration_minutes}
          examEndTime={exam.end_time}
          initialActiveSeconds={0}
          negativeMarking={exam.negative_marking}
          shuffle={exam.shuffle_questions}
          proctoring={exam.proctoring}
          questions={previewQuestions}
          initialAnswers={{}}
          initialTextAnswers={{}}
          initialFlags={{}}
          preview
        />
      </div>
    </div>
  );
}
