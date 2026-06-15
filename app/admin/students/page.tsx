import { createClient } from "@/lib/supabase/server";
import StudentImport from "./StudentImport";
import StudentSearch from "./StudentSearch";

export default async function StudentsPage() {
  const supabase = await createClient();

  const [{ data: students }, { data: batches }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, created_at")
      .eq("role", "student")
      .order("created_at", { ascending: false }),
    supabase.from("batches").select("id, name, courses(name)").order("name"),
  ]);

  const batchOptions =
    batches?.map((b) => ({
      id: b.id,
      label: `${(b.courses as unknown as { name: string } | null)?.name ?? ""} — ${b.name}`,
    })) ?? [];

  const studentList =
    students?.map((s) => ({
      id: s.id,
      full_name: s.full_name,
      email: s.email,
      created_at: s.created_at,
    })) ?? [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="mt-1 text-sm text-slate-500">
            {students?.length ?? 0} total students
          </p>
        </div>
        <StudentImport batches={batchOptions} />
      </div>

      <StudentSearch students={studentList} />
    </div>
  );
}
