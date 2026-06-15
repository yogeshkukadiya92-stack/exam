import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createCourse, deleteCourse } from "./actions";

export default async function CoursesPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, description, batches(count)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Courses</h1>

      {/* Create form */}
      <form
        action={createCourse}
        className="mb-6 rounded-xl border bg-white p-4"
      >
        <h2 className="mb-3 font-medium">Navo course banavo</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            name="name"
            required
            placeholder="Course name (e.g. NEET 2025)"
            className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
          <input
            name="description"
            placeholder="Description (optional)"
            className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
          />
          <button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            Add
          </button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-2">
        {courses?.length === 0 && (
          <p className="text-sm text-gray-500">Haju koi course nathi.</p>
        )}
        {courses?.map((c) => {
          const batchCount =
            (c.batches as { count: number }[] | null)?.[0]?.count ?? 0;
          return (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border bg-white p-4"
            >
              <div>
                <Link
                  href={`/admin/courses/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.name}
                </Link>
                {c.description && (
                  <p className="text-sm text-gray-500">{c.description}</p>
                )}
                <p className="text-xs text-gray-400">{batchCount} batch</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/courses/${c.id}`}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
                >
                  Batches
                </Link>
                <form action={deleteCourse}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                    Delete
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
