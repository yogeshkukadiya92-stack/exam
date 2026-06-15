import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, Play, RotateCcw, Trophy } from "lucide-react";

export default async function StudentExams() {
  const supabase = await createClient();

  const [{ data: exams }, { data: attempts }] = await Promise.all([
    supabase
      .from("exams")
      .select("id, title, duration_minutes, negative_marking, courses(name), batches(name), questions(count)")
      .order("created_at", { ascending: false }),
    supabase
      .from("attempts")
      .select("id, exam_id, status, total_score")
      .order("started_at", { ascending: false }),
  ]);

  type Attempt = NonNullable<typeof attempts>[number];
  const byExam = new Map<string, Attempt[]>();
  attempts?.forEach((a) => {
    const list = byExam.get(a.exam_id) ?? [];
    list.push(a);
    byExam.set(a.exam_id, list);
  });

  const available = (exams ?? []).filter(
    (e) => ((e.questions as { count: number }[] | null)?.[0]?.count ?? 0) > 0
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">My Exams</h1>
        <p className="mt-1 text-sm text-slate-500">
          View and attempt your assigned exams
        </p>
      </div>

      {available.length === 0 && (
        <div className="card p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-slate-500">
            No exams assigned to you yet.
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Check back later or contact your instructor.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {available.map((e) => {
          const list = byExam.get(e.id) ?? [];
          const inProgress = list.find((a) => a.status === "in_progress");
          const submitted = list.filter((a) => a.status !== "in_progress");
          const scores = submitted
            .map((a) => a.total_score)
            .filter((s): s is number => s != null);
          const best = scores.length ? Math.max(...scores) : null;
          const course = (e.courses as unknown as { name: string } | null)?.name;
          const batch = (e.batches as unknown as { name: string } | null)?.name;

          return (
            <div key={e.id} className="card-hover flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{e.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">{course} · {batch}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>{e.duration_minutes} min</span>
                  {e.negative_marking && (
                    <span className="badge bg-red-50 text-red-600">Negative marking</span>
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
                ) : (
                  <Link href={`/student/exam/${e.id}`} className="btn-primary flex items-center gap-1.5">
                    <Play className="h-4 w-4" />
                    Start
                  </Link>
                )}
                {submitted.length > 0 && (
                  <Link
                    href={`/student/attempt/${submitted[0].id}/result`}
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
