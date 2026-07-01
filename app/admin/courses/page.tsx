import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createCourse, deleteCourse } from "./actions";
import EditCourseButton from "./EditCourseButton";
import { Plus, Layers, Trash2 } from "lucide-react";

interface CourseRow {
  id: string;
  name: string;
  description: string | null;
  batches: { count: number }[] | null;
}

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, description, batches(count)")
    .order("created_at", { ascending: false });
  const rows = (courses as CourseRow[] | null) ?? [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Courses</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your courses and batches
        </p>
      </div>

      <form action={createCourse} className="card mb-8 p-5">
        <h2 className="section-title mb-4">Create new course</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            required
            placeholder="Course name (e.g. NEET 2025)"
            className="input flex-1"
          />
          <input
            name="description"
            placeholder="Description (optional)"
            className="input flex-1"
          />
          <button className="btn-primary flex items-center justify-center gap-1.5">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {rows.length === 0 && (
          <div className="card p-8 text-center">
            <Layers className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No courses yet. Create your first course above.
            </p>
          </div>
        )}
        {rows.map((c) => {
          const batchCount =
            (c.batches as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <div key={c.id} className="card-hover flex items-center justify-between p-5">
              <div>
                <Link
                  href={`/admin/courses/${c.id}`}
                  className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                >
                  {c.name}
                </Link>
                {c.description && (
                  <p className="mt-0.5 text-sm text-slate-500">{c.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  {batchCount} {batchCount === 1 ? "batch" : "batches"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <EditCourseButton
                  id={c.id}
                  name={c.name}
                  description={(c.description as string | null)}
                />
                <Link href={`/admin/courses/${c.id}`} className="btn-secondary text-sm">
                  Batches
                </Link>
                <form action={deleteCourse}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="btn-danger flex items-center gap-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
