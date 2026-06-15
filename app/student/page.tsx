import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
      <h1 className="mb-4 text-xl font-semibold">My Exams</h1>

      {available.length === 0 && (
        <div className="rounded-xl border bg-white p-6 text-center text-gray-400">
          Tamne haju koi exam assign nathi thayu.
        </div>
      )}

      <div className="space-y-2">
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
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-sm text-gray-500">{course} · {batch}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {e.duration_minutes} min
                  {e.negative_marking ? " · negative marking" : ""}
                  {best != null ? ` · best score: ${best}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {inProgress ? (
                  <Link href={`/student/attempt/${inProgress.id}`}
                    className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                    Resume
                  </Link>
                ) : (
                  <Link href={`/student/exam/${e.id}`}
                    className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                    Start
                  </Link>
                )}
                {submitted.length > 0 && (
                  <Link href={`/student/attempt/${submitted[0].id}/result`}
                    className="rounded-md border px-3 py-2 text-sm hover:bg-gray-100">
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
