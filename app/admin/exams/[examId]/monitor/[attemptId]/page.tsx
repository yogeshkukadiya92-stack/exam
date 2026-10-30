import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { examProgress, hasAnswer } from "@/lib/exam-progress";
import RichTextContent from "@/components/RichTextContent";
import { readMonitorAnswers, readMonitorQuestions } from "../data";
import LiveRefresh from "../LiveRefresh";
import AdminSubmitButton from "../AdminSubmitButton";

export default async function StudentProgressPage({ params }: {
  params: Promise<{ examId: string; attemptId: string }>;
}) {
  await requireAdmin();
  const { examId, attemptId } = await params;
  const supabase = await createClient();
  const { data: attempt, error } = await supabase.from("attempts")
    .select("id, student_id, status, started_at, submitted_at, exams!inner(title)")
    .eq("id", attemptId).eq("exam_id", examId).maybeSingle();
  if (error) throw new Error("Unable to load this student's attempt.");
  if (!attempt) notFound();
  const [questions, answers, profileResult] = await Promise.all([
    readMonitorQuestions(examId), readMonitorAnswers(examId, attemptId),
    supabase.from("profiles").select("full_name, email").eq("id", attempt.student_id).single(),
  ]);
  if (profileResult.error) throw new Error("Unable to load the student profile.");
  const profile = profileResult.data;
  const name = profile.full_name || profile.email || "Student";
  const exam = attempt.exams as unknown as { title: string };
  const progress = examProgress(questions.map((question) => question.id), answers);
  const byQuestion = new Map(answers.map((answer) => [answer.question_id, answer]));

  return <div>
    <Link href={`/admin/exams/${examId}/monitor`} className="text-sm text-slate-500 hover:text-indigo-600">Back to live monitor</Link>
    <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="page-title">{name}</h1>
        <p className="mt-1 text-sm text-slate-500">{profile.email} · {exam.title}</p>
        <p className="mt-2 text-sm font-medium">Status: {attempt.status.replaceAll("_", " ")}</p>
      </div>
      {attempt.status === "in_progress" && <AdminSubmitButton examId={examId} attemptId={attemptId} studentName={name} />}
    </div>
    <LiveRefresh updatedAt={new Date().toISOString()} />
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[["Total questions", progress.total], ["Answered", progress.answered], ["Marked for review", progress.review], ["Skipped / unanswered", progress.skipped]].map(([label, value]) =>
        <div key={label} className="card p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>
      )}
    </div>
    <p className="mb-5 text-sm text-slate-500">Only server-saved responses appear here. Review overlaps answered / unanswered. Unanswered includes questions not yet reached. Question numbers follow the original exam order; a student's shuffled order may differ.</p>
    <div className="space-y-4">
      {questions.map((question, index) => {
        const answer = byQuestion.get(question.id);
        const answered = answer && hasAnswer(answer);
        const selected = question.options.filter((option) => answer?.selected_option_ids?.includes(option.id));
        return <article key={question.id} className="card p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            <h2 className="font-semibold">Question {index + 1}</h2>
            <span className={`badge ${answered ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{answered ? "Answered" : "Skipped / unanswered"}</span>
            {answer?.marked_for_review && <span className="badge bg-amber-100 text-amber-800">Marked for review</span>}
          </div>
          <RichTextContent content={question.question_text} />
          <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Student response</p>
            {selected.map((option) => <div key={option.id} className="mb-2"><RichTextContent content={option.option_text} /></div>)}
            {answer?.text_answer?.trim() && <p className="whitespace-pre-wrap break-words text-sm">{answer.text_answer}</p>}
            {!answered && <p className="text-sm text-slate-500">No saved answer.</p>}
          </div>
        </article>;
      })}
      {!questions.length && <p className="card p-5 text-sm text-slate-500">No questions have been added to this exam.</p>}
    </div>
  </div>;
}
