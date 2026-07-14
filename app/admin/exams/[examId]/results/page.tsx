import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResultsExport from "./ResultsExport";
import { ChevronRight, TrendingUp, Users, Award, Activity } from "lucide-react";

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
  sections?: { section_id: string; section_name: string; avg_score: number; total_marks: number }[];
  topics?: { topic: string; attempted: number; correct: number; wrong: number; accuracy: number }[];
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

  const advancedAnalytics = await supabase.rpc("get_exam_analytics_v2", {
    p_exam_id: examId,
  });

  let analytics = advancedAnalytics.data as Analytics | null;

  if (advancedAnalytics.error || !analytics) {
    const legacyAnalytics = await supabase.rpc("get_exam_analytics", {
      p_exam_id: examId,
    });

    if (legacyAnalytics.error || !legacyAnalytics.data) notFound();
    analytics = legacyAnalytics.data as Analytics;
  }

  const { summary, attempts, questions } = analytics;
  const sections = analytics.sections ?? [];
  const topics = analytics.topics ?? [];
  const passRate =
    summary.total_attempts > 0
      ? Math.round((summary.pass_count / summary.total_attempts) * 100)
      : 0;

  const buckets = [0, 0, 0, 0, 0];
  const tm = summary.total_marks || 1;
  attempts.forEach((a) => {
    const pct = ((a.score ?? 0) / tm) * 100;
    const b = Math.min(4, Math.max(0, Math.floor(pct / 20)));
    buckets[b]++;
  });
  const maxBucket = Math.max(...buckets, 1);
  const bucketLabels = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"];

  const statCards = [
    { label: "Attempts", value: summary.total_attempts, icon: Users, color: "from-blue-500 to-blue-600", shadow: "shadow-blue-200" },
    { label: "Avg Score", value: `${summary.avg_score} / ${summary.total_marks}`, icon: TrendingUp, color: "from-violet-500 to-violet-600", shadow: "shadow-violet-200" },
    { label: "Pass Rate", value: `${passRate}%`, icon: Award, color: "from-emerald-500 to-emerald-600", shadow: "shadow-emerald-200" },
    { label: "High / Low", value: `${summary.max_score} / ${summary.min_score}`, icon: Activity, color: "from-amber-500 to-amber-600", shadow: "shadow-amber-200" },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/admin/exams" className="hover:text-indigo-600 transition-colors">Exams</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-700 font-medium">{exam.title}</span>
      </div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{exam.title} — Results</h1>
          <p className="mt-1 text-sm text-slate-500">Performance analytics</p>
        </div>
        <ResultsExport
          examTitle={exam.title}
          attempts={attempts}
          passMarks={summary.pass_marks}
        />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-sm ${s.shadow}`}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-xl font-bold tracking-tight">{s.value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {summary.total_attempts === 0 ? (
        <div className="card p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-slate-500">No attempts yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="section-title mb-5">Score Distribution</h2>
            <div className="space-y-3">
              {buckets.map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-16 shrink-0 text-xs font-medium text-slate-500">{bucketLabels[i]}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-lg bg-slate-100">
                    <div
                      className="h-full rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                      style={{ width: `${(c / maxBucket) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs font-semibold text-slate-600">{c}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="section-title mb-5">Hardest Questions</h2>
            <div className="space-y-3 text-sm">
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
                      <span className="truncate text-slate-700">
                        <span className="text-slate-400">{i + 1}.</span> {q.question_text}
                      </span>
                      <span className="badge bg-red-50 text-red-600 shrink-0">{rate}% wrong</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {summary.total_attempts > 0 && (
        <div className="mt-8">
          <h2 className="section-title mb-4">Leaderboard</h2>
          <div className="table-shell">
            <table className="admin-table min-w-[680px]">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-left dark:border-slate-700 dark:bg-slate-800/70">
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Score</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {attempts.map((a, i) => {
                  const pass = (a.score ?? 0) >= summary.pass_marks;
                  return (
                    <tr key={a.attempt_id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                      <td className="font-medium text-slate-400">{i + 1}</td>
                      <td>
                        <p className="font-medium text-slate-900">{a.student_name}</p>
                        <p className="text-xs text-slate-400">{a.email}</p>
                      </td>
                      <td className="font-semibold">
                        {a.score ?? 0} <span className="text-slate-400 font-normal">/ {summary.total_marks}</span>
                      </td>
                      <td>
                        <span className={`badge ${pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
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

      {summary.total_attempts > 0 && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="section-title mb-5">Section Performance</h2>
            <div className="space-y-3 text-sm">
              {sections.length === 0 && <p className="text-slate-500">No sections configured.</p>}
              {sections.map((s) => (
                <div key={s.section_id} className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-700">{s.section_name}</span>
                  <span className="badge bg-indigo-50 text-indigo-700">
                    Avg {s.avg_score} / {s.total_marks}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="section-title mb-5">Topic Accuracy</h2>
            <div className="space-y-3 text-sm">
              {topics.length === 0 && <p className="text-slate-500">No topic data yet.</p>}
              {topics.map((t) => (
                <div key={t.topic} className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-700">{t.topic}</span>
                  <span className="badge bg-emerald-50 text-emerald-700">
                    {t.accuracy}% accuracy
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
