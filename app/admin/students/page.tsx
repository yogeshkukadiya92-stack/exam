import { createClient } from "@/lib/supabase/server";
import StudentImport from "./StudentImport";
import { Users } from "lucide-react";

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

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/50 text-left">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Name
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students?.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-medium text-slate-900">
                  {s.full_name || "—"}
                </td>
                <td className="px-5 py-3.5 text-slate-500">{s.email}</td>
              </tr>
            ))}
            {students?.length === 0 && (
              <tr>
                <td colSpan={2} className="px-5 py-12 text-center">
                  <Users className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">
                    No students yet. Use bulk import or let students sign up.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
