import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Award, ArrowLeft, Trophy, CheckCircle2, XCircle, MinusCircle, BarChart3, Target, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
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
    show_correct_answers?: boolean | null;
    show_explanations?: boolean | null;
    result_visible?: boolean | null;
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

  if (error || !data) {
    // Don't show a bare 404. Log the real reason and show a friendly page.
    console.error("get_attempt_result failed:", error?.message ?? "no data", { attemptId });
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
          <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">
            Exam submitted
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Your exam has been submitted. The result is not available right now.
          </p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            Please refresh in a moment, or check back from My Exams.
          </p>
          <Link
            href="/student"
            className="btn-primary mt-6 inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to My Exams
          </Link>
        </div>
      </div>
    );
  }
  const result = data as ResultData;
  const { exam, questions } = result;

  // Read the visibility settings straight from the exams table so admin's
  // per-exam choices are respected regardless of the RPC version deployed.
  const { data: attemptRow } = await supabase
    .from("attempts")
    .select("exam_id")
    .eq("id", attemptId)
    .maybeSingle();

  let settings: {
    show_correct_answers: boolean | null;
    show_explanations: boolean | null;
    result_visible: boolean | null;
  } | null = null;
  if (attemptRow?.exam_id) {
    const { data: examSettings } = await supabase
      .from("exams")
      .select("show_correct_answers, show_explanations, result_visible")
      .eq("id", attemptRow.exam_id)
      .maybeSingle();
    settings = examSettings;
  }

  const resultVisible = (settings?.result_visible ?? exam.result_visible) !== false;
  const showAnswers = (settings?.show_correct_answers ?? exam.show_correct_answers) === true;
  const showExplanations = (settings?.show_explanations ?? exam.show_explanations) === true;

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
  const answered = questions.filter((q) => (q.selected?.length ?? 0) > 0).length;
  const passed = score >= exam.pass_marks;
  const totalQ = questions.length;
  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const accuracy = totalQ - skipped > 0 ? Math.round((correct / (totalQ - skipped)) * 100) : 0;
  const marksEarned = questions.reduce((s, q) => s + Math.max(0, q.score ?? 0), 0);
  const marksLostNeg = Math.abs(questions.reduce((s, q) => s + Math.min(0, q.score ?? 0), 0));
  const marksSkipped = questions.filter((q) => q.is_correct === null).reduce((s, q) => s + Number(q.marks), 0);
  const correctPct = totalQ > 0 ? (correct / totalQ) * 100 : 0;
  const wrongPct = totalQ > 0 ? (wrong / totalQ) * 100 : 0;
  const skippedPct = totalQ > 0 ? (skipped / totalQ) * 100 : 0;

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

      {/* Score Card */}
      <div
        className={`card overflow-hidden ${
          passed ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-800"
        }`}
      >
        <div
          className={`px-6 py-8 text-center ${
            passed
              ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20"
              : "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20"
          }`}
        >
          <Award
            className={`mx-auto h-14 w-14 ${
              passed ? "text-emerald-500" : "text-red-400"
            }`}
          />
          <h1 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">{exam.title}</h1>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {score}{" "}
            <span className="text-lg font-normal text-slate-400 dark:text-slate-500">/ {totalMarks}</span>
          </p>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">{percentage}%</p>
          <span
            className={`mt-2 inline-block badge text-sm ${
              passed
                ? "bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                : "bg-red-200/80 text-red-800 dark:bg-red-900/50 dark:text-red-300"
            }`}
          >
            {passed ? "Passed" : "Failed"} — Pass marks: {exam.pass_marks}
          </span>
          <div className="mt-4 flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
            {showAnswers ? (
              <>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> {correct} correct
                </span>
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <XCircle className="h-4 w-4" /> {wrong} wrong
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <CheckCircle2 className="h-4 w-4" /> {answered} answered
              </span>
            )}
            <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <MinusCircle className="h-4 w-4" /> {skipped} skipped
            </span>
          </div>
        </div>
      </div>

      {/* Analysis Report */}
      <h2 className="mb-4 mt-8 section-title flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-indigo-500" /> Analysis Report
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-6">
        <div className="card p-4 text-center">
          <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/50">
            <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{percentage}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Score Percentage</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {showAnswers ? `${accuracy}%` : answered}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {showAnswers ? "Accuracy" : "Answered"}
          </p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-green-100 dark:bg-green-950/50">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-green-700 dark:text-green-400">+{marksEarned}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Marks Earned</p>
        </div>
        <div className="card p-4 text-center">
          <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/50">
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-700 dark:text-red-400">-{marksLostNeg}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Negative Marks</p>
        </div>
      </div>

      {/* Performance Bar */}
      {showAnswers ? (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Question Performance</h3>
          <div className="h-6 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700">
            {correctPct > 0 && (
              <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${correctPct}%` }} />
            )}
            {wrongPct > 0 && (
              <div className="bg-red-400 h-full transition-all duration-700" style={{ width: `${wrongPct}%` }} />
            )}
            {skippedPct > 0 && (
              <div className="bg-slate-300 dark:bg-slate-500 h-full transition-all duration-700" style={{ width: `${skippedPct}%` }} />
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Correct: {correct}/{totalQ} ({Math.round(correctPct)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" /> Wrong: {wrong}/{totalQ} ({Math.round(wrongPct)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-500" /> Skipped: {skipped}/{totalQ} ({Math.round(skippedPct)}%)
            </span>
          </div>
        </div>
      ) : (
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Attempt Summary</h3>
          <div className="h-6 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-700">
            {answered > 0 && (
              <div className="bg-indigo-500 h-full transition-all duration-700" style={{ width: `${(answered / Math.max(totalQ, 1)) * 100}%` }} />
            )}
            {skipped > 0 && (
              <div className="bg-slate-300 dark:bg-slate-500 h-full transition-all duration-700" style={{ width: `${skippedPct}%` }} />
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" /> Answered: {answered}/{totalQ}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-500" /> Skipped: {skipped}/{totalQ}
            </span>
          </div>
        </div>
      )}

      {/* Marks Breakdown */}
      <div className="card p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Marks Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Marks</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{totalMarks}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Marks Earned
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">+{marksEarned}</span>
          </div>
          {exam.negative_marking && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" /> Negative Marking
              </span>
              <span className="font-semibold text-red-700 dark:text-red-400">-{marksLostNeg}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> Marks from Skipped
            </span>
            <span className="font-semibold text-slate-400 dark:text-slate-500">-{marksSkipped}</span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Your Score</span>
            <span className={`text-lg font-bold ${passed ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
              {score} / {totalMarks}
            </span>
          </div>
        </div>
      </div>

      {/* Per-Question Score Table */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-700/30">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Question-wise Score</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/30 text-left dark:border-slate-700 dark:bg-slate-700/20">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Q#</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:table-cell">Max</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Score</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {questions.map((q, i) => {
                const qScore = q.score ?? 0;
                return (
                  <tr key={q.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">{i + 1}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 hidden sm:table-cell">{q.marks}</td>
                    <td className={`px-4 py-2.5 font-semibold ${
                      qScore > 0 ? "text-emerald-700 dark:text-emerald-400" : qScore < 0 ? "text-red-700 dark:text-red-400" : "text-slate-400 dark:text-slate-500"
                    }`}>
                      {qScore > 0 ? `+${qScore}` : qScore}
                    </td>
                    <td className="px-4 py-2.5">
                      {!showAnswers ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5 dark:bg-indigo-950/50 dark:text-indigo-400">
                          <CheckCircle2 className="h-3 w-3" /> {(q.selected?.length ?? 0) > 0 ? "Answered" : "Skipped"}
                        </span>
                      ) : q.is_correct === true ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 dark:bg-emerald-950/50 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Correct
                        </span>
                      ) : q.is_correct === false ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 rounded-full px-2 py-0.5 dark:bg-red-950/50 dark:text-red-400">
                          <XCircle className="h-3 w-3" /> Wrong
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 dark:bg-slate-700 dark:text-slate-400">
                          <MinusCircle className="h-3 w-3" /> Skipped
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
