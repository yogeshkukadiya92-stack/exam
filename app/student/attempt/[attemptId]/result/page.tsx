import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Award } from "lucide-react";
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
  exam: { title: string; pass_marks: number; negative_marking: boolean };
  total_score: number | null;
  questions: ResultQuestion[];
}

const clr = (s: number) =>
  s > 0 ? "text-emerald-600" : s < 0 ? "text-red-600" : "text-gray-400";

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

  const totalMarks = questions.reduce((s, q) => s + Number(q.marks), 0);
  const score = result.total_score ?? 0;
  const correct = questions.filter((q) => q.is_correct === true).length;
  const wrong = questions.filter((q) => q.is_correct === false).length;
  const skipped = questions.filter((q) => q.is_correct === null).length;
  const passed = score >= exam.pass_marks;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between print:hidden">
        <Link href="/student" className="inline-block text-sm text-gray-500 hover:text-gray-900">
          ← My Exams
        </Link>
        <div className="flex items-center gap-2">
          {passed && (
            <Link
              href={`/student/attempt/${attemptId}/certificate`}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
            >
              🏆 Certificate
            </Link>
          )}
          <PrintButton />
        </div>
      </div>

      <div className={`rounded-xl border p-6 text-center ${passed ? "bg-emerald-50" : "bg-red-50"}`}>
        <Award className={`mx-auto h-10 w-10 ${passed ? "text-emerald-600" : "text-red-500"}`} />
        <h1 className="mt-1 text-lg font-semibold">{exam.title}</h1>
        <p className="mt-1 text-3xl font-bold">
          {score} <span className="text-lg font-normal text-gray-400">/ {totalMarks}</span>
        </p>
        <p className={`mt-1 font-medium ${passed ? "text-emerald-700" : "text-red-600"}`}>
          {passed ? "Passed ✓" : "Failed"}
        </p>
        <div className="mt-3 flex justify-center gap-4 text-sm">
          <span className="text-emerald-600">✓ {correct} correct</span>
          <span className="text-red-600">✗ {wrong} wrong</span>
          <span className="text-gray-400">– {skipped} skipped</span>
        </div>
      </div>

      <h2 className="mb-2 mt-6 font-semibold">Review</h2>
      <div className="space-y-3">
        {questions.map((q, i) => {
          const sel = q.selected ?? [];
          return (
            <div key={q.id} className="rounded-xl border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{i + 1}. {q.question_text}</p>
                <span className={`shrink-0 text-sm font-medium ${clr(q.score ?? 0)}`}>
                  {(q.score ?? 0) > 0 ? `+${q.score}` : q.score ?? 0} marks
                </span>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {q.options.map((o) => {
                  const chosen = sel.includes(o.id);
                  return (
                    <li
                      key={o.id}
                      className={
                        o.is_correct
                          ? "text-emerald-700"
                          : chosen
                          ? "text-red-600 line-through"
                          : "text-gray-500"
                      }
                    >
                      {o.is_correct ? "✓ " : chosen ? "✗ " : "• "}
                      {o.option_text}
                      {chosen && !o.is_correct && (
                        <span className="ml-1 text-xs">(taro answer)</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {q.explanation && (
                <p className="mt-2 rounded-md bg-blue-50 p-2 text-xs text-blue-700">
                  💡 {q.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
