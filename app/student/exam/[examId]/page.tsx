import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startAttempt } from "./actions";
import { ArrowLeft, Clock, Target, RotateCcw, AlertTriangle, FileText } from "lucide-react";

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

  const { data: exam } = await supabase
    .from("exams")
    .select("id, title, instructions, duration_minutes, pass_marks, negative_marking, max_attempts, courses(name), batches(name), questions(count)")
    .eq("id", examId)
    .single();

  if (!exam) notFound();

  const qCount = (exam.questions as { count: number }[] | null)?.[0]?.count ?? 0;
  const course = (exam.courses as unknown as { name: string } | null)?.name;
  const batch = (exam.batches as unknown as { name: string } | null)?.name;

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
            <div className="rounded-xl bg-slate-50 p-3.5">
              <div className="flex items-center gap-2 text-slate-500">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Questions</span>
              </div>
              <p className="mt-1 text-xl font-bold">{qCount}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <div className="flex items-center gap-2 text-slate-500">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Duration</span>
              </div>
              <p className="mt-1 text-xl font-bold">{exam.duration_minutes} min</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <div className="flex items-center gap-2 text-slate-500">
                <Target className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Pass marks</span>
              </div>
              <p className="mt-1 text-xl font-bold">{exam.pass_marks}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5">
              <div className="flex items-center gap-2 text-slate-500">
                <RotateCcw className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Attempts</span>
              </div>
              <p className="mt-1 text-xl font-bold">{exam.max_attempts}</p>
            </div>
          </div>

          {exam.negative_marking && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Negative marking is enabled — wrong answers will deduct marks.
            </div>
          )}

          {exam.instructions && (
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              {exam.instructions}
            </div>
          )}

          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
            Once started, the timer begins. Answers are auto-saved. Navigate using the question palette and submit when done.
          </div>

          <form action={startAttempt} className="mt-5">
            <input type="hidden" name="exam_id" value={exam.id} />
            <button className="btn-primary w-full text-base">
              Start exam
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
