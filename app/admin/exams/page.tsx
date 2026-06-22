import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExamForm from "./ExamForm";
import ExamFilters from "./ExamFilters";
import { Trash2 } from "lucide-react";

export default async function ExamsPage() {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, batches(id, name)")
    .order("name");

  const { data: exams } = await supabase
    .from("exams")
    .select(
      "id, title, instructions, is_published, duration_minutes, pass_marks, negative_marking, shuffle_questions, proctoring, show_correct_answers, show_explanations, result_visible, max_attempts, start_time, end_time, course_id, batch_id, courses(name), batches(name), questions(count)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { count: trashCount } = await supabase
    .from("exams")
    .select("id", { count: "exact", head: true })
    .not("deleted_at", "is", null);

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
      pass_marks: Number(e.pass_marks) || 0,
      negative_marking: e.negative_marking,
      shuffle_questions: e.shuffle_questions,
      proctoring: e.proctoring,
      show_correct_answers: e.show_correct_answers ?? true,
      show_explanations: e.show_explanations ?? true,
      result_visible: e.result_visible ?? true,
      max_attempts: e.max_attempts,
      start_time: e.start_time,
      end_time: e.end_time,
      instructions: e.instructions,
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
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Exams</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage your examinations
          </p>
        </div>
        <Link
          href="/admin/exams/trash"
          className="btn-secondary flex shrink-0 items-center gap-1.5 text-sm"
        >
          <Trash2 className="h-4 w-4" />
          Trash
          {(trashCount ?? 0) > 0 && (
            <span className="badge bg-red-100 text-red-700">{trashCount}</span>
          )}
        </Link>
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
        courses={(courses as never) ?? []}
        batches={batchList}
      />
    </div>
  );
}
