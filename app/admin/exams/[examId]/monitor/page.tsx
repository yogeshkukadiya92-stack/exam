import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface MonitorRow {
  student_name: string;
  email: string;
  attempt_id: string | null;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  tab_switch_count: number;
  last_seen_at: string | null;
  time_left_seconds: number | null;
}

export default async function LiveMonitorPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("title").eq("id", examId).single();
  if (!exam) notFound();

  const { data } = await supabase.rpc("get_live_exam_monitor", { p_exam_id: examId });
  const students = ((data as { students?: MonitorRow[] } | null)?.students ?? []) as MonitorRow[];

  return (
    <div>
      <Link href="/admin/exams" className="text-sm text-slate-500 hover:text-indigo-600">Back to exams</Link>
      <h1 className="page-title mt-2">{exam.title} Live Monitor</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Refresh page for latest status.</p>

      <div className="table-shell">
        <table className="admin-table min-w-[760px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/70">
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th>Time left</th>
              <th>Tab switches</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {students.map((s) => (
              <tr key={`${s.email}-${s.attempt_id ?? "none"}`} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                <td>
                  <p className="font-medium">{s.student_name}</p>
                  <p className="text-xs text-slate-400">{s.email}</p>
                </td>
                <td><span className="badge bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">{s.status}</span></td>
                <td>{formatSeconds(s.time_left_seconds)}</td>
                <td>{s.tab_switch_count ?? 0}</td>
                <td>{s.last_seen_at ? new Date(s.last_seen_at).toLocaleString("en-IN") : "-"}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-500">
                  No enrolled students are visible for this exam yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatSeconds(value: number | null) {
  if (value == null) return "-";
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
