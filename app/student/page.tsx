import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  BookOpen,
  Play,
  RotateCcw,
  Trophy,
  Target,
  TrendingUp,
  Award,
  BarChart3,
  Megaphone,
  CheckCircle2,
} from "lucide-react";

export default async function StudentDashboard() {
  const supabase = await createClient();

  const [{ data: exams }, { data: attempts }, { data: announcements }, { data: overrides }] =
    await Promise.all([
      supabase
        .from("exams")
        .select(
          "id, title, duration_minutes, negative_marking, pass_marks, max_attempts, courses(name), batches(name), questions(count)"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("attempts")
        .select("id, exam_id, status, total_score, submitted_at")
        .order("started_at", { ascending: false }),
      supabase
        .from("announcements")
        .select("id, title, content, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("student_exam_overrides")
        .select("exam_id, extra_attempts"),
    ]);

  const extraByExam = new Map<string, number>(
    (overrides ?? []).map((o: { exam_id: string; extra_attempts: number | null }) => [
      o.exam_id,
      Number(o.extra_attempts) || 0,
    ])
  );

  type Attempt = NonNullable<typeof attempts>[number];
  const byExam = new Map<string, Attempt[]>();
  attempts?.forEach((a) => {
    const list = byExam.get(a.exam_id) ?? [];
    list.push(a);
    byExam.set(a.exam_id, list);
  });

  // Stats
  const submitted = attempts?.filter((a) => a.status !== "in_progress") ?? [];
  const totalTaken = submitted.length;
  const scores = submitted
    .map((a) => a.total_score)
    .filter((s): s is number => s != null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  // Pass rate: count exams where best attempt >= pass_marks
  const examMap = new Map<string, number>(
    (exams ?? []).map((e: { id: string; pass_marks: unknown }) => [e.id, Number(e.pass_marks) || 0])
  );
  let passCount = 0;
  const examsSeen = new Set<string>();
  for (const a of submitted) {
    if (examsSeen.has(a.exam_id)) continue;
    examsSeen.add(a.exam_id);
    const examAttempts = byExam.get(a.exam_id) ?? [];
    const bestForExam = Math.max(
      ...examAttempts
        .filter((x) => x.status !== "in_progress")
        .map((x) => x.total_score ?? 0)
    );
    if (bestForExam >= (examMap.get(a.exam_id) ?? 0)) passCount++;
  }
  const passRate = examsSeen.size > 0 ? Math.round((passCount / examsSeen.size) * 100) : 0;

  const recentResults = submitted.slice(0, 5);

  const available = (exams ?? []).filter(
    (e) => ((e.questions as { count: number }[] | null)?.[0]?.count ?? 0) > 0
  );

  const statCards = [
    { label: "Exams Taken", value: totalTaken, icon: Target, color: "from-blue-500 to-blue-600", shadow: "shadow-blue-200" },
    { label: "Average Score", value: avgScore, icon: TrendingUp, color: "from-violet-500 to-violet-600", shadow: "shadow-violet-200" },
    { label: "Pass Rate", value: `${passRate}%`, icon: Award, color: "from-emerald-500 to-emerald-600", shadow: "shadow-emerald-200" },
    { label: "Best Score", value: bestScore, icon: Trophy, color: "from-amber-500 to-amber-600", shadow: "shadow-amber-200" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your exam performance at a glance
        </p>
      </div>

      {/* Announcements */}
      {announcements && announcements.length > 0 && (
        <div className="mb-8 space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="card border-l-4 border-l-indigo-500 p-4"
            >
              <div className="flex items-start gap-3">
                <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{a.title}</p>
                  {a.content && (
                    <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">
                      {a.content}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(a.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5">
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} shadow-sm ${s.shadow}`}
            >
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-xl font-bold tracking-tight">{s.value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <div className="mb-8">
          <h2 className="section-title mb-4">Recent Results</h2>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-left dark:border-slate-700 dark:bg-slate-700/30">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Exam
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Score
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                      Date
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {recentResults.map((a) => {
                    const examTitle =
                      exams?.find((e) => e.id === a.exam_id)?.title ?? "Exam";
                    return (
                      <tr
                        key={a.id}
                        className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30"
                      >
                        <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                          {examTitle}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="badge bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
                            {a.total_score ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                          {a.submitted_at
                            ? new Date(a.submitted_at).toLocaleDateString(
                                "en-IN",
                                { day: "numeric", month: "short" }
                              )
                            : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/student/attempt/${a.id}/result`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Available Exams */}
      <h2 className="section-title mb-4">Available Exams</h2>
      {available.length === 0 && (
        <div className="card p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-500">No exams assigned to you yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Check back later or contact your instructor.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {available.map((e) => {
          const list = byExam.get(e.id) ?? [];
          const inProgress = list.find((a) => a.status === "in_progress");
          const sub = list.filter((a) => a.status !== "in_progress");
          const examScores = sub
            .map((a) => a.total_score)
            .filter((s): s is number => s != null);
          const best = examScores.length ? Math.max(...examScores) : null;
          const attemptLimit = (Number(e.max_attempts) || 1) + (extraByExam.get(e.id) ?? 0);
          const attemptsLeft = !inProgress && sub.length < attemptLimit;
          const course = (e.courses as unknown as { name: string } | null)
            ?.name;
          const batch = (e.batches as unknown as { name: string } | null)
            ?.name;

          return (
            <div
              key={e.id}
              className="card-hover flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{e.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {course} · {batch}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>{e.duration_minutes} min</span>
                  {e.negative_marking && (
                    <span className="badge bg-red-50 text-red-600">
                      Negative marking
                    </span>
                  )}
                  {best != null && (
                    <span className="badge bg-emerald-50 text-emerald-600">
                      <Trophy className="h-3 w-3" />
                      Best: {best}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {inProgress ? (
                  <Link
                    href={`/student/attempt/${inProgress.id}`}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-amber-200 transition-all hover:shadow-md active:scale-[0.98]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Resume
                  </Link>
                ) : attemptsLeft ? (
                  <Link
                    href={`/student/exam/${e.id}`}
                    className="btn-primary flex items-center gap-1.5"
                  >
                    <Play className="h-4 w-4" />
                    Start
                  </Link>
                ) : (
                  <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                )}
                {sub.length > 0 && (
                  <Link
                    href={`/student/attempt/${sub[0].id}/result`}
                    className="btn-secondary text-sm"
                  >
                    Result
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
