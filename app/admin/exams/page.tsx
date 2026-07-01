import Link from "next/link";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ExamForm from "./ExamForm";
import ExamFilters from "./ExamFilters";

interface BatchRow {
  id: string;
  name: string;
}

interface CourseRow {
  id: string;
  name: string;
  batches: BatchRow[] | null;
}

interface ExamRow {
  id: string;
  title: string;
  instructions: string | null;
  is_published: boolean;
  duration_minutes: number;
  pass_marks: number | string | null;
  negative_marking: boolean;
  shuffle_questions: boolean;
  proctoring: boolean;
  show_correct_answers: boolean | null;
  show_explanations: boolean | null;
  result_visible: boolean | null;
  exam_mode: string | null;
  timer_mode: string | null;
  allow_case_navigation: boolean | null;
  max_attempts: number;
  start_time: string | null;
  end_time: string | null;
  course_id: string;
  batch_id: string;
  courses: { name: string } | null;
  batches: { name: string } | null;
  questions: { count: number }[] | null;
}

export default async function ExamsPage() {
  const supabase = await createClient();

  const [{ data: courses }, examsQuery, { count: trashCount }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, name, batches(id, name)")
        .order("name"),
      supabase
        .from("exams")
        .select(
          "id, title, instructions, is_published, duration_minutes, pass_marks, negative_marking, shuffle_questions, proctoring, show_correct_answers, show_explanations, result_visible, exam_mode, timer_mode, allow_case_navigation, max_attempts, start_time, end_time, course_id, batch_id, courses(name), batches(name), questions(count)"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("exams")
        .select("id", { count: "exact", head: true })
        .not("deleted_at", "is", null),
    ]);
  const fallbackExamsQuery = examsQuery.error
    ? await supabase
        .from("exams")
        .select(
          "id, title, instructions, is_published, duration_minutes, pass_marks, negative_marking, shuffle_questions, proctoring, show_correct_answers, show_explanations, result_visible, max_attempts, start_time, end_time, course_id, batch_id, courses(name), batches(name), questions(count)"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
    : null;

  const courseRows = (courses as CourseRow[] | null) ?? [];
  const examRows = ((examsQuery.data ?? fallbackExamsQuery?.data) as ExamRow[] | null) ?? [];
  const formCourses = courseRows.map((course) => ({
    id: course.id,
    name: course.name,
    batches: course.batches ?? [],
  }));
  const hasCourses = formCourses.length > 0;

  const batchList: { id: string; label: string }[] = [];
  courseRows.forEach((course) => {
    course.batches?.forEach((batch) => {
      batchList.push({ id: batch.id, label: `${course.name} - ${batch.name}` });
    });
  });

  const examList = examRows.map((exam) => ({
    id: exam.id,
    title: exam.title,
    is_published: exam.is_published,
    duration_minutes: exam.duration_minutes,
    pass_marks: Number(exam.pass_marks) || 0,
    negative_marking: exam.negative_marking,
    shuffle_questions: exam.shuffle_questions,
    proctoring: exam.proctoring,
    show_correct_answers: exam.show_correct_answers ?? true,
    show_explanations: exam.show_explanations ?? true,
    result_visible: exam.result_visible ?? true,
    exam_mode: exam.exam_mode ?? "standard",
    timer_mode: exam.timer_mode ?? "continuous",
    allow_case_navigation: exam.allow_case_navigation ?? true,
    max_attempts: exam.max_attempts,
    start_time: exam.start_time,
    end_time: exam.end_time,
    instructions: exam.instructions,
    course_id: exam.course_id,
    batch_id: exam.batch_id,
    courseName: exam.courses?.name ?? "",
    batchName: exam.batches?.name ?? "",
    qCount: exam.questions?.[0]?.count ?? 0,
  }));

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
        <ExamForm courses={formCourses} />
      ) : (
        <div className="card mb-8 border-amber-200 bg-amber-50 p-4">
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
        courses={formCourses}
        batches={batchList}
      />
    </div>
  );
}
