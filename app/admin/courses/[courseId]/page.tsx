import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBatch, deleteBatch } from "../actions";
import EditBatchButton from "./EditBatchButton";
import { Plus, Trash2, ChevronRight } from "lucide-react";

export default async function CourseBatchesPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, name")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  const { data: batches } = await supabase
    .from("batches")
    .select("id, name, enrollments(count)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/admin/courses" className="hover:text-indigo-600 transition-colors">
          Courses
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-700 font-medium">{course.name}</span>
      </div>
      <div className="mb-8">
        <h1 className="page-title">{course.name} — Batches</h1>
      </div>

      <form action={createBatch} className="card mb-8 p-5">
        <h2 className="section-title mb-4">Create new batch</h2>
        <input type="hidden" name="course_id" value={courseId} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            required
            placeholder="Batch name (e.g. 2025 Morning)"
            className="input flex-1"
          />
          <button className="btn-primary flex items-center justify-center gap-1.5">
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {batches?.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm text-slate-500">No batches yet. Create one above.</p>
          </div>
        )}
        {batches?.map((b) => {
          const studentCount =
            (b.enrollments as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <div key={b.id} className="card-hover flex items-center justify-between p-5">
              <div>
                <p className="font-semibold text-slate-900">{b.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {studentCount} {studentCount === 1 ? "student" : "students"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <EditBatchButton id={b.id} courseId={courseId} name={b.name} />
                <form action={deleteBatch}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="course_id" value={courseId} />
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
