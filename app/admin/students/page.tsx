import { createClient } from "@/lib/supabase/server";
import ManualStudentForm from "./ManualStudentForm";
import StudentImport from "./StudentImport";
import StudentSearch from "./StudentSearch";
import StudentExport from "./StudentExport";

interface StudentRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface BatchRow {
  id: string;
  name: string;
  courses: { name: string } | null;
}

interface EnrollmentRow {
  student_id: string;
  batch_id: string;
}

export default async function StudentsPage() {
  const supabase = await createClient();

  const [{ data: students }, { data: batches }, { data: enrollments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at")
        .eq("role", "student")
        .order("created_at", { ascending: false }),
      supabase.from("batches").select("id, name, courses(name)").order("name"),
      supabase.from("enrollments").select("student_id, batch_id"),
    ]);

  const studentRows = (students as StudentRow[] | null) ?? [];
  const batchRows = (batches as BatchRow[] | null) ?? [];
  const enrollmentRows = (enrollments as EnrollmentRow[] | null) ?? [];

  const batchOptions = batchRows.map((batch) => ({
    id: batch.id,
    label: `${batch.courses?.name ?? ""} - ${batch.name}`,
  }));

  const batchLabelById = new Map<string, string>(
    batchOptions.map((batch) => [batch.id, batch.label] as [string, string])
  );

  const enrollmentsByStudent: Record<string, { batchId: string; label: string }[]> = {};
  enrollmentRows.forEach((enrollment) => {
    const list = enrollmentsByStudent[enrollment.student_id] ?? [];
    list.push({
      batchId: enrollment.batch_id,
      label: batchLabelById.get(enrollment.batch_id) ?? "Unknown batch",
    });
    enrollmentsByStudent[enrollment.student_id] = list;
  });

  const studentList = studentRows.map((student) => ({
    id: student.id,
    full_name: student.full_name,
    email: student.email,
    phone: student.phone,
    created_at: student.created_at,
  }));

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="mt-1 text-sm text-slate-500">
            {studentRows.length} total students
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StudentExport students={studentList} />
          <StudentImport batches={batchOptions} />
        </div>
      </div>

      <ManualStudentForm batches={batchOptions} />

      <StudentSearch
        students={studentList}
        batches={batchOptions}
        enrollmentsByStudent={enrollmentsByStudent}
      />
    </div>
  );
}
