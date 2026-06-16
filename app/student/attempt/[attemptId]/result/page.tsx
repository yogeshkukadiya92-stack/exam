import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Award, ArrowLeft, Trophy, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import PrintButton from "./PrintButton";

interface ResultQuestion {
  id: string;
  question_text: string;
  marks: number;
  negative_marks: number;
  explanation: string | null;
  score: number | null;
  is_correct: boolean | null;
  selected: string[] | null;
  options: { id: string; option_text: string; is_correct: boolean }[];
}

interface ResultData {
  exam: {
    title: string;
    pass_marks: number;
    negative_marking: boolean;
    show_correct_answers: boolean;
    show_explanations: boolean;
    result_visible: boolean;
  };
  total_score: number | null;
  questions: ResultQuestion[];
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_attempt_result", {
    p_attempt_id: attemptId,
  });

  if (error || !data) notFound();
  const result = data as ResultData;
  const { exam, questions } = result;

  const resultVisible = exam.result_visible !== false;
  const showAnswers = exam.show_correct_answers !== false;
  const showExplanations = exam.show_explanations !== false;

  // Result not released by admin
  if (!resultVisible) {
    return (
      <div>
        <div className="mb-4 print:hidden">
          <Link
            href="/student"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> My Exams
          </Link>
        </div>
        <div className="card p-12 text-center">
          <Award className="mx-auto h-14 w-14 text-slate-300" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">{exam.title}</h1>
          <p className="mt-2 text-slate-500">
            Your exam has been submitted successfully.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Results will be available once released by the administrator.
          </p>
        </div>
      </div>
    );
  }

  const totalMarks = questions.reduce((s, q) => s + Number(q.marks), 0);
  const score = result.total_score ?? 0;
  const correct = questions.filter((q) => q.is_correct === true).length;
  const wrong = questions.filter((q) => q.is_correct === false).length;
  const skipped = questions.filter((q) => q.is_correct === null).length;
  const passed = score >= exam.pass_marks;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/student"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> My Exams
        </Link>
        <div className="flex items-center gap-2">
          {passed && (
            <Link
              href={`/student/attempt/${attemptId}/certificate`}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <Trophy className="h-4 w-4" />
              Certificate
            </Link>
          )}
          <PrintButton />
        </div>
      </div>

      <div
        className={`card overflow-hidden ${
          passed ? "border-emerald-200" : "border-red-200"
        }`}
      >
        <div
          className={`px-6 py-8 text-center ${
            passed
              ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50"
              : "bg-gradient-to-br from-red-50 to-red-100/50"
          }`}
        >
          <Award
            className={`mx-auto h-14 w-14 ${
              passed ? "text-emerald-500" : "text-red-400"
            }`}
          />
          <h1 className="mt-3 text-xl font-bold text-slate-900">{exam.title}</h1>
          <p className="mt-2 text-4xl font-bold tracking-tight">
            {score}{" "}
            <span className="text-lg font-normal text-slate-400">/ {totalMarks}</span>
          </p>
          <span
            className={`mt-2 inline-block badge text-sm ${
              passed
                ? "bg-emerald-200/80 text-emerald-800"
                : "bg-red-200/80 text-red-800"
            }`}
          >
            {passed ? "Passed" : "Failed"}
          </span>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> {correct} correct
            </span>
            <span className="flex items-center gap-1.5 text-red-600">
              <XCircle className="h-4 w-4" /> {wrong} wrong
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <MinusCircle className="h-4 w-4" /> {skipped} skipped
            </span>
          </div>
        </div>
      </div>

      {showAnswers && (
        <>
          <h2 className="mb-4 mt-8 section-title">Review</h2>
          <div className="space-y-3">
            {questions.map((q, i) => {
              const sel = q.selected ?? [];
              const qScore = q.score ?? 0;
              return (
                <div key={q.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-slate-900">
                      <span className="text-slate-400">{i + 1}.</span> {q.question_text}
                    </p>
                    <span
                      className={`badge shrink-0 ${
                        qScore > 0
                          ? "bg-emerald-100 text-emerald-700"
                          : qScore < 0
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {qScore > 0 ? `+${qScore}` : qScore} marks
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm">
                    {q.options.map((o) => {
                      const chosen = sel.includes(o.id);
                      return (
                        <li
                          key={o.id}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                            o.is_correct
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : chosen
                              ? "bg-red-50 text-red-600 border border-red-200 line-through"
                              : "text-slate-500"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                              o.is_correct
                                ? "bg-emerald-200 text-emerald-800"
                                : chosen
                                ? "bg-red-200 text-red-700"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {o.is_correct ? "✓" : chosen ? "✗" : "·"}
                          </span>
                          {o.option_text}
                          {chosen && !o.is_correct && (
                            <span className="ml-auto text-xs font-medium text-red-400">
                              Your answer
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {showExplanations && q.explanation && (
                    <div className="mt-3 rounded-xl bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">
                      <span className="font-medium">Explanation:</span> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
