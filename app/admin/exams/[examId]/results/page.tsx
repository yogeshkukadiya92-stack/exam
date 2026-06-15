import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResultsExport from "./ResultsExport";

interface Analytics {
  summary: {
    total_attempts: number;
    avg_score: number;
    max_score: number;
    min_score: number;
    pass_count: number;
    total_marks: number;
    pass_marks: number;
  };
  attempts: {
    attempt_id: string;
    student_name: string;
    email: string;
    score: number | null;
    submitted_at: string | null;
  }[];
  questions: { id: string; question_text: string; correct: number; wrong: number }[];
}

export default async function ExamResultsPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("title")
    .eq("id", examId)
    .single();
  if (!exam) notFound();

  const { data, error } = await supabase.rpc("get_exam_analytics", {
    p_exam_id: examId,
  });
  if (error) notFound();

  const { summary, attempts, questions } = data as Analytics;
  const passRate =
    summary.total_attempts > 0
      ? Math.round((summary.pass_count / summary.total_attempts) * 100)
      : 0;

  // score distribution buckets (0-20, 20-40, ... of total marks)
  const buckets = [0, 0, 0, 0, 0];
  const tm = summary.total_marks || 1;
  attempts.forEach((a) => {
    const pct = ((a.score ?? 0) / tm) * 100;
    const b = Math.min(4, Math.max(0, Math.floor(pct / 20)));
    buckets[b]++;
  });
  const maxBucket = Math.max(...buckets, 1);
  const bucketLabels = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"];

  return (
    <div>
      <div className="mb-1 text-sm text-gray-500">
        <Link href="/admin/exams" className="hover:underline">Exams</Link> / {exam.title}
      </div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{exam.title} — Results</h1>
        <ResultsExport
          examTitle={exam.title}
          attempts={attempts}
          passMarks={summary.pass_marks}
        />
      </div>

      {/* summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card label="Attempts" value={summary.total_attempts} />
        <Card label="Avg score" value={`${summary.avg_score} / ${summary.total_marks}`} />
        <Card label="Pass rate" value={`${passRate}%`} />
        <Card label="High / Low" value={`${summary.max_score} / ${summary.min_score}`} />
      </div>

      {summary.total_attempts === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center text-gray-400">
          Haju koi student e aa exam aapyu nathi.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* score distribution */}
          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 font-medium">Score distribution</h2>
            <div className="space-y-2">
              {buckets.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 text-gray-500">{bucketLabels[i]}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
                    <div
                      className="h-full rounded bg-gray-900"
                      style={{ width: `${(c / maxBucket) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-gray-500">{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* hardest questions */}
          <div className="rounded-xl border bg-white p-5">
            <h2 className="mb-4 font-medium">Hardest questions</h2>
            <div className="space-y-2 text-sm">
              {[...questions]
                .map((q) => ({ ...q, total: q.correct + q.wrong }))
                .sort((a, b) => {
                  const ra = a.total ? a.wrong / a.total : 0;
                  const rb = b.total ? b.wrong / b.total : 0;
                  return rb - ra;
                })
                .slice(0, 5)
                .map((q, i) => {
                  const rate = q.total ? Math.round((q.wrong / q.total) * 100) : 0;
                  return (
                    <div key={q.id} className="flex items-center justify-between gap-3">
                      <span className="truncate text-gray-700">{i + 1}. {q.question_text}</span>
                      <span className="shrink-0 text-red-600">{rate}% wrong</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* leaderboard */}
      {summary.total_attempts > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-medium">Leaderboard</h2>
          <div className="overflow-hidden rounded-xl border bg-white">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Student</th>
                  <th className="px-4 py-2 font-medium">Score</th>
                  <th className="px-4 py-2 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a, i) => {
                  const pass = (a.score ?? 0) >= summary.pass_marks;
                  return (
                    <tr key={a.attempt_id} className="border-b last:border-0">
                      <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2">
                        {a.student_name}
                        <span className="block text-xs text-gray-400">{a.email}</span>
                      </td>
                      <td className="px-4 py-2 font-medium">
                        {a.score ?? 0} / {summary.total_marks}
                      </td>
                      <td className="px-4 py-2">
                        <span className={pass ? "text-emerald-600" : "text-red-600"}>
                          {pass ? "Pass" : "Fail"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
