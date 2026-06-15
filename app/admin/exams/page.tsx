import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExamForm from "./ExamForm";
import { deleteExam, togglePublish } from "./actions";
import { Trash2, FileText, BarChart3, Eye, EyeOff } from "lucide-react";

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
      <div className="mb-8">
        <h1 className="page-title">Exams</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create and manage your examinations
        </p>
      </div>

      {hasCourses ? (
        <ExamForm courses={(courses as never) ?? []} />
      ) : (
        <div className="mb-8 card border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">
            To create an exam, first{" "}
            <Link href="/admin/courses" className="font-semibold underline">
              create a course and batch
            </Link>
            .
          </p>
        </div>
      )}

      <div className="space-y-3">
        {exams?.length === 0 && (
          <div className="card p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No exams yet. Create your first exam above.
            </p>
          </div>
        )}
        {exams?.map((e) => {
          const qCount =
            (e.questions as { count: number }[] | null)?.[0]?.count ?? 0;
          const course = (e.courses as unknown as { name: string } | null)?.name;
          const batch = (e.batches as unknown as { name: string } | null)?.name;
          return (
            <div key={e.id} className="card-hover p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-slate-900 truncate">
                      {e.title}
                    </span>
                    <span
                      className={`badge ${
                        e.is_published
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {e.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {course} · {batch}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {qCount} questions · {e.duration_minutes} min
                    {e.negative_marking ? " · negative marking" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link
                    href={`/admin/exams/${e.id}/questions`}
                    className="btn-secondary flex items-center gap-1.5 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Questions
                  </Link>
                  <Link
                    href={`/admin/exams/${e.id}/results`}
                    className="btn-secondary flex items-center gap-1.5 text-xs"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Results
                  </Link>
                  <form action={togglePublish}>
                    <input type="hidden" name="id" value={e.id} />
                    <input
                      type="hidden"
                      name="publish"
                      value={(!e.is_published).toString()}
                    />
                    <button className="btn-secondary flex items-center gap-1.5 text-xs">
                      {e.is_published ? (
                        <><EyeOff className="h-3.5 w-3.5" /> Unpublish</>
                      ) : (
                        <><Eye className="h-3.5 w-3.5" /> Publish</>
                      )}
                    </button>
                  </form>
                  <form action={deleteExam}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="btn-danger flex items-center gap-1 text-xs">
                      <Trash2 className="h-3.5 w-3.5" />
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
