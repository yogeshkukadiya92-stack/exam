import { createClient } from "@/lib/supabase/server";
import StudentImport from "./StudentImport";

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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Students</h1>
        <span className="text-sm text-gray-500">{students?.length ?? 0} total</span>
      </div>

      <div className="mb-5">
        <StudentImport batches={batchOptions} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {students?.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-4 py-2">{s.full_name || "—"}</td>
                <td className="px-4 py-2 text-gray-600">{s.email}</td>
              </tr>
            ))}
            {students?.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-gray-400">
                  Haju koi student nathi. Upar thi bulk import karo athva student signup kare.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
