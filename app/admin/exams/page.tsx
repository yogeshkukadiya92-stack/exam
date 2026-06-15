import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExamForm from "./ExamForm";
import { deleteExam, togglePublish } from "./actions";

export default async function ExamsPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, batches(id, name)")
    .order("name");

  const { data: exams } = await supabase
    .from("exams")
    .select(
      "id, title, is_published, duration_minutes, negative_marking, courses(name), batches(name), questions(count)"
    )
    .order("created_at", { ascending: false });

  const hasCourses = (courses?.length ?? 0) > 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Exams</h1>

      {hasCourses ? (
        <ExamForm courses={(courses as never) ?? []} />
      ) : (
        <p className="mb-6 rounded-xl border bg-amber-50 p-4 text-sm text-amber-700">
          Exam banava pela{" "}
          <Link href="/admin/courses" className="font-medium underline">
            ek course ane batch
          </Link>{" "}
          banavo.
        </p>
      )}

      <div className="space-y-2">
        {exams?.length === 0 && (
          <p className="text-sm text-gray-500">Haju koi exam nathi.</p>
        )}
        {exams?.map((e) => {
          const qCount =
            (e.questions as { count: number }[] | null)?.[0]?.count ?? 0;
          const course = (e.courses as unknown as { name: string } | null)?.name;
          const batch = (e.batches as unknown as { name: string } | null)?.name;
          return (
            <div key={e.id} className="rounded-xl border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{e.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        e.is_published
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {e.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {course} · {batch}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {qCount} questions · {e.duration_minutes} min
                    {e.negative_marking ? " · negative marking" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link
                    href={`/admin/exams/${e.id}/questions`}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
                  >
                    Questions
                  </Link>
                  <Link
                    href={`/admin/exams/${e.id}/results`}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
                  >
                    Results
                  </Link>
                  <form action={togglePublish}>
                    <input type="hidden" name="id" value={e.id} />
                    <input
                      type="hidden"
                      name="publish"
                      value={(!e.is_published).toString()}
                    />
                    <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100">
                      {e.is_published ? "Unpublish" : "Publish"}
                    </button>
                  </form>
                  <form action={deleteExam}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
