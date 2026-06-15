import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExamForm from "./ExamForm";
import ExamFilters from "./ExamFilters";
import { FileText } from "lucide-react";

export default async function ExamsPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, batches(id, name)")
    .order("name");

  const { data: exams } = await supabase
    .from("exams")
    .select(
      "id, title, is_published, duration_minutes, negative_marking, course_id, batch_id, courses(name), batches(name), questions(count)"
    )
    .order("created_at", { ascending: false });

  const hasCourses = (courses?.length ?? 0) > 0;

  const courseList =
    courses?.map((c) => ({ id: c.id, name: c.name })) ?? [];

  const batchList: { id: string; label: string }[] = [];
  courses?.forEach((c) => {
    const batches = c.batches as { id: string; name: string }[] | null;
    batches?.forEach((b) => {
      batchList.push({ id: b.id, label: `${c.name} — ${b.name}` });
    });
  });

  const examList =
    exams?.map((e) => ({
      id: e.id,
      title: e.title,
      is_published: e.is_published,
      duration_minutes: e.duration_minutes,
      negative_marking: e.negative_marking,
      course_id: e.course_id,
      batch_id: e.batch_id,
      courseName:
        (e.courses as unknown as { name: string } | null)?.name ?? "",
      batchName:
        (e.batches as unknown as { name: string } | null)?.name ?? "",
      qCount:
        (e.questions as { count: number }[] | null)?.[0]?.count ?? 0,
    })) ?? [];

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

      <ExamFilters
        exams={examList}
        courses={courseList}
        batches={batchList}
      />
    </div>
  );
}
