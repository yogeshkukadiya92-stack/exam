import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { grantExtraAttempt, resetAttempt } from "./actions";

interface StudentEnrollmentRow {
  student_id: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string | null;
  } | null;
}

interface AttemptRow {
  id: string;
  student_id: string;
  status: string;
  total_score: number | null;
  started_at: string | null;
  submitted_at: string | null;
}

interface OverrideRow {
  student_id: string;
  extra_attempts: number | null;
  notes: string | null;
}

export default async function AttemptControlsPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("title, batch_id").eq("id", examId).single();
  if (!exam) notFound();

  const [{ data: students }, { data: attempts }, { data: overrides }] = await Promise.all([
    supabase
      .from("enrollments")
      .select("student_id, profiles(id, full_name, email)")
      .eq("batch_id", exam.batch_id),
    supabase
      .from("attempts")
      .select("id, student_id, status, total_score, started_at, submitted_at")
      .eq("exam_id", examId)
      .order("started_at", { ascending: false }),
    supabase
      .from("student_exam_overrides")
      .select("student_id, extra_attempts, notes")
      .eq("exam_id", examId),
  ]);

  const studentRows = (students as StudentEnrollmentRow[] | null) ?? [];
  const attemptRows = (attempts as AttemptRow[] | null) ?? [];
  const overrideRows = (overrides as OverrideRow[] | null) ?? [];
  const attemptByStudent = new Map(attemptRows.map((a) => [a.student_id, a]));
  const overrideByStudent = new Map(overrideRows.map((o) => [o.student_id, o]));

  return (
    <div>
      <Link href="/admin/exams" className="text-sm text-slate-500 hover:text-indigo-600">Back to exams</Link>
      <h1 className="page-title mt-2">{exam.title} Re-attempt Controls</h1>

      <div className="mt-6 space-y-3">
        {studentRows.map((row) => {
          const student = row.profiles;
          if (!student) return null;
          const attempt = attemptByStudent.get(student.id);
          const override = overrideByStudent.get(student.id);
          return (
            <div key={student.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{student.full_name || student.email}</p>
                  <p className="text-sm text-slate-500">
                    Attempt: {attempt?.status ?? "not_started"} · Extra: {override?.extra_attempts ?? 0}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={grantExtraAttempt} className="flex gap-2">
                    <input type="hidden" name="exam_id" value={examId} />
                    <input type="hidden" name="student_id" value={student.id} />
                    <input name="extra_attempts" type="number" min={1} defaultValue={1} className="input w-20" />
                    <button className="btn-secondary">Grant</button>
                  </form>
                  {attempt && (
                    <form action={resetAttempt}>
                      <input type="hidden" name="exam_id" value={examId} />
                      <input type="hidden" name="attempt_id" value={attempt.id} />
                      <button className="btn-danger">Reset attempt</button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
