import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBatch, deleteBatch } from "../actions";

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
      <div className="mb-1 text-sm text-gray-500">
        <Link href="/admin/courses" className="hover:underline">
          Courses
        </Link>{" "}
        / {course.name}
      </div>
      <h1 className="mb-6 text-2xl font-semibold">{course.name} — Batches</h1>

      <form action={createBatch} className="mb-6 rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-medium">Navi batch banavo</h2>
        <input type="hidden" name="course_id" value={courseId} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            required
            placeholder="Batch name (e.g. 2025 Morning)"
            className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
          <button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            Add
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {batches?.length === 0 && (
          <p className="text-sm text-gray-500">Haju koi batch nathi.</p>
        )}
        {batches?.map((b) => {
          const studentCount =
            (b.enrollments as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-xl border bg-white p-4"
            >
              <div>
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-gray-400">{studentCount} student</p>
              </div>
              <form action={deleteBatch}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="course_id" value={courseId} />
                <button className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                  Delete
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
