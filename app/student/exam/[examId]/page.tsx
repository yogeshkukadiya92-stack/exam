import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { startAttempt } from "./actions";
import { ArrowLeft, Clock, Target, RotateCcw, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";

interface AttemptSummary {
  id: string;
  status: string;
}

export default async function ExamIntro({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { examId } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const examQuery = await supabase
    .from("exams")
    .select("id, title, instructions, duration_minutes, pass_marks, negative_marking, max_attempts, start_time, end_time, deleted_at, exam_mode, timer_mode, allow_case_navigation, courses(name), batches(name), questions(count)")
    .eq("id", examId)
    .single();
  const fallbackExamQuery = examQuery.error
    ? await supabase
        .from("exams")
        .select("id, title, instructions, duration_minutes, pass_marks, negative_marking, max_attempts, start_time, end_time, deleted_at, courses(name), batches(name), questions(count)")
        .eq("id", examId)
        .single()
    : null;
  const exam = examQuery.data ?? fallbackExamQuery?.data;

  if (!exam || exam.deleted_at) {
    return <ExamUnavailable />;
  }

  const qCount = (exam.questions as { count: number }[] | null)?.[0]?.count ?? 0;
  const examSettings = exam as typeof exam & {
    exam_mode?: string | null;
    timer_mode?: string | null;
    allow_case_navigation?: boolean | null;
  };
  const isPractical = examSettings.exam_mode === "practical";
  const course = (exam.courses as unknown as { name: string } | null)?.name;
  const batch = (exam.batches as unknown as { name: string } | null)?.name;

  // Attempts left calculation — block re-take once submitted (max_attempts + extra).
  const { data: auth } = await supabase.auth.getUser();
  const studentId = auth.user?.id;

  const [{ data: myAttempts }, { data: override }, caseCountResult] = await Promise.all([
    supabase
      .from("attempts")
      .select("id, status")
      .eq("exam_id", examId)
      .eq("student_id", studentId ?? "")
      .order("started_at", { ascending: false }),
    supabase
      .from("student_exam_overrides")
      .select("extra_attempts")
      .eq("exam_id", examId)
      .eq("student_id", studentId ?? "")
      .maybeSingle(),
    isPractical
      ? supabase
          .from("case_studies")
          .select("id", { count: "exact", head: true })
          .eq("exam_id", examId)
      : Promise.resolve({ count: 0 }),
  ]);
  const caseCount = caseCountResult.count ?? 0;

  const attempts = (myAttempts ?? []) as AttemptSummary[];
  const inProgress = attempts.find((a) => a.status === "in_progress");
  const submittedAttempts = attempts.filter((a) => a.status !== "in_progress");
  const lastSubmitted = submittedAttempts[0];
  const attemptLimit =
    (Number(exam.max_attempts) || 1) + (Number(override?.extra_attempts) || 0);
  const noAttemptsLeft = !inProgress && submittedAttempts.length >= attemptLimit;

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/student"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> My Exams
      </Link>

      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5">
          <h1 className="text-xl font-bold text-white">{exam.title}</h1>
          <p className="mt-0.5 text-sm text-indigo-200">{course} · {batch}</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-700/50">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Questions</span>
              </div>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{qCount}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-700/50">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  {isPractical ? "Active time" : "Duration"}
                </span>
              </div>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{exam.duration_minutes} min</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-700/50">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Target className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Pass marks</span>
              </div>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{exam.pass_marks}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-700/50">
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <RotateCcw className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Attempts</span>
              </div>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{exam.max_attempts}</p>
            </div>
          </div>

          {isPractical && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-cyan-50 p-3 text-sm text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-500">
                  Case studies
                </p>
                <p className="mt-1 text-lg font-semibold">{caseCount}</p>
              </div>
              <div className="rounded-xl bg-cyan-50 p-3 text-sm text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-500">
                  Timer
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {examSettings.timer_mode === "pausable" ? "Pausable" : "Continuous"}
                </p>
              </div>
            </div>
          )}

          {exam.negative_marking && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Negative marking is enabled — wrong answers will deduct marks.
            </div>
          )}

          {(exam.start_time || exam.end_time) && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
              {exam.start_time && (
                <p>Start: {formatIndiaDateTime(exam.start_time as string)}</p>
              )}
              {exam.end_time && (
                <p>End: {formatIndiaDateTime(exam.end_time as string)}</p>
              )}
            </div>
          )}

          {exam.instructions && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Instructions
              </p>
              <div className="whitespace-pre-line leading-relaxed">{exam.instructions}</div>
            </div>
          )}

          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400">
            {isPractical && examSettings.timer_mode === "pausable"
              ? "Your active timer pauses when you pause or leave the practical exam. Answers are auto-saved."
              : "Once started, the timer begins. Answers are auto-saved. Navigate using the question palette and submit when done."}
            {" "}Once you submit, you cannot retake this exam or change your answers.
          </div>

          {noAttemptsLeft ? (
            <div className="mt-5">
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                You have already submitted this exam.
              </div>
              {lastSubmitted && (
                <Link
                  href={`/student/attempt/${lastSubmitted.id}/result`}
                  className="btn-primary mt-3 flex w-full items-center justify-center text-base"
                >
                  View result
                </Link>
              )}
            </div>
          ) : inProgress ? (
            <Link
              href={`/student/attempt/${inProgress.id}`}
              className="btn-primary mt-5 flex w-full items-center justify-center text-base"
            >
              Resume exam
            </Link>
          ) : (
            <form action={startAttempt} className="mt-5">
              <input type="hidden" name="exam_id" value={exam.id} />
              <button className="btn-primary w-full text-base">
                Start exam
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function ExamUnavailable() {
  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/student"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" /> My Exams
      </Link>

      <div className="card p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Exam link is not available
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This exam may be a draft, deleted, or not assigned to your batch.
        </p>
        <Link href="/student" className="btn-primary mt-5 inline-flex">
          Go to My Exams
        </Link>
      </div>
    </div>
  );
}

function formatIndiaDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
