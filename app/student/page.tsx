import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Megaphone,
  Play,
  RotateCcw,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";

interface ExamRow {
  id: string;
  title: string;
  duration_minutes: number;
  negative_marking: boolean;
  pass_marks: number | string | null;
  max_attempts: number | null;
  courses: { name: string } | null;
  batches: { name: string } | null;
  questions: { count: number }[] | null;
}

interface AttemptRow {
  id: string;
  exam_id: string;
  status: string;
  total_score: number | null;
  submitted_at: string | null;
}

interface AnnouncementRow {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
}

interface OverrideRow {
  exam_id: string;
  extra_attempts: number | null;
}

function questionCount(exam: ExamRow) {
  return exam.questions?.[0]?.count ?? 0;
}

export default async function StudentDashboard() {
  const supabase = await createClient();

  const [
    { data: exams },
    { data: attempts },
    { data: announcements },
    { data: overrides },
  ] = await Promise.all([
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
    supabase.from("student_exam_overrides").select("exam_id, extra_attempts"),
  ]);

  const examRows = (exams as ExamRow[] | null) ?? [];
  const attemptRows = (attempts as AttemptRow[] | null) ?? [];
  const announcementRows = (announcements as AnnouncementRow[] | null) ?? [];
  const overrideRows = (overrides as OverrideRow[] | null) ?? [];

  const extraByExam = new Map<string, number>(
    overrideRows.map((override) => [
      override.exam_id,
      Number(override.extra_attempts) || 0,
    ])
  );

  const byExam = new Map<string, AttemptRow[]>();
  attemptRows.forEach((attempt) => {
    const list = byExam.get(attempt.exam_id) ?? [];
    list.push(attempt);
    byExam.set(attempt.exam_id, list);
  });

  const submitted = attemptRows.filter((attempt) => attempt.status !== "in_progress");
  const scores = submitted
    .map((attempt) => attempt.total_score)
    .filter((score): score is number => score != null);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  const passMarksByExam = new Map<string, number>(
    examRows.map((exam) => [exam.id, Number(exam.pass_marks) || 0])
  );
  let passCount = 0;
  const examsSeen = new Set<string>();
  submitted.forEach((attempt) => {
    if (examsSeen.has(attempt.exam_id)) return;
    examsSeen.add(attempt.exam_id);

    const bestForExam = Math.max(
      0,
      ...(byExam.get(attempt.exam_id) ?? [])
        .filter((item) => item.status !== "in_progress")
        .map((item) => item.total_score ?? 0)
    );
    if (bestForExam >= (passMarksByExam.get(attempt.exam_id) ?? 0)) passCount++;
  });
  const passRate = examsSeen.size > 0 ? Math.round((passCount / examsSeen.size) * 100) : 0;

  const recentResults = submitted.slice(0, 5);
  const available = examRows.filter((exam) => questionCount(exam) > 0);

  const statCards = [
    {
      label: "Exams Taken",
      value: submitted.length,
      icon: Target,
      color: "from-blue-500 to-blue-600",
      shadow: "shadow-blue-200",
    },
    {
      label: "Average Score",
      value: avgScore,
      icon: TrendingUp,
      color: "from-violet-500 to-violet-600",
      shadow: "shadow-violet-200",
    },
    {
      label: "Pass Rate",
      value: `${passRate}%`,
      icon: Award,
      color: "from-emerald-500 to-emerald-600",
      shadow: "shadow-emerald-200",
    },
    {
      label: "Best Score",
      value: bestScore,
      icon: Trophy,
      color: "from-amber-500 to-amber-600",
      shadow: "shadow-amber-200",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your exam performance at a glance
        </p>
      </div>

      {announcementRows.length > 0 && (
        <div className="mb-8 space-y-3">
          {announcementRows.map((announcement) => (
            <div
              key={announcement.id}
              className="card border-l-4 border-l-indigo-500 p-4"
            >
              <div className="flex items-start gap-3">
                <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {announcement.title}
                  </p>
                  {announcement.content && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                      {announcement.content}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(announcement.created_at).toLocaleDateString("en-IN", {
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

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} shadow-sm ${stat.shadow}`}
            >
              <stat.icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-xl font-bold tracking-tight">{stat.value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

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
                    <th className="hidden px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:table-cell">
                      Date
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {recentResults.map((attempt) => {
                    const examTitle =
                      examRows.find((exam) => exam.id === attempt.exam_id)?.title ?? "Exam";
                    return (
                      <tr
                        key={attempt.id}
                        className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30"
                      >
                        <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                          {examTitle}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="badge bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
                            {attempt.total_score ?? 0}
                          </span>
                        </td>
                        <td className="hidden px-5 py-3.5 text-slate-500 dark:text-slate-400 sm:table-cell">
                          {attempt.submitted_at
                            ? new Date(attempt.submitted_at).toLocaleDateString(
                                "en-IN",
                                { day: "numeric", month: "short" }
                              )
                            : "-"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link
                            href={`/student/attempt/${attempt.id}/result`}
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
        {available.map((exam) => {
          const list = byExam.get(exam.id) ?? [];
          const inProgress = list.find((attempt) => attempt.status === "in_progress");
          const submittedForExam = list.filter((attempt) => attempt.status !== "in_progress");
          const examScores = submittedForExam
            .map((attempt) => attempt.total_score)
            .filter((score): score is number => score != null);
          const best = examScores.length ? Math.max(...examScores) : null;
          const attemptLimit =
            (Number(exam.max_attempts) || 1) + (extraByExam.get(exam.id) ?? 0);
          const attemptsLeft = !inProgress && submittedForExam.length < attemptLimit;

          return (
            <div
              key={exam.id}
              className="card-hover flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{exam.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {exam.courses?.name ?? "Course"} - {exam.batches?.name ?? "Batch"}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>{exam.duration_minutes} min</span>
                  {exam.negative_marking && (
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
                    href={`/student/exam/${exam.id}`}
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
                {submittedForExam.length > 0 && (
                  <Link
                    href={`/student/attempt/${submittedForExam[0].id}/result`}
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
