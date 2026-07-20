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

interface AttemptSessionRow {
  attempt_id: string;
  started_at: string;
  ended_at: string | null;
  last_seen_at: string | null;
}

export default async function LiveMonitorPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const supabase = await createClient();
  const { data: exam } = await supabase
    .from("exams")
    .select("title, duration_minutes, timer_mode, end_time")
    .eq("id", examId)
    .single();
  if (!exam) notFound();

  const { data } = await supabase.rpc("get_live_exam_monitor", { p_exam_id: examId });
  const students = ((data as { students?: MonitorRow[] } | null)?.students ?? []) as MonitorRow[];
  const attemptIds = students
    .filter((student) => student.status === "in_progress" && student.attempt_id)
    .map((student) => student.attempt_id as string);
  const { data: sessions } =
    exam.timer_mode === "pausable" && attemptIds.length > 0
      ? await supabase
          .from("attempt_sessions")
          .select("attempt_id, started_at, ended_at, last_seen_at")
          .in("attempt_id", attemptIds)
      : { data: [] };

  const sessionRows = (sessions as AttemptSessionRow[] | null) ?? [];
  const activeSecondsByAttempt = new Map<string, number>();
  sessionRows.forEach((session) => {
    activeSecondsByAttempt.set(
      session.attempt_id,
      (activeSecondsByAttempt.get(session.attempt_id) ?? 0) + sessionDurationSeconds(session)
    );
  });

  const monitorRows = students.map((student) => ({
    ...student,
    display_time_left_seconds:
      exam.timer_mode === "pausable"
        ? getPausableTimeLeft({
            activeSeconds: student.attempt_id
              ? activeSecondsByAttempt.get(student.attempt_id)
              : undefined,
            durationMinutes: Number(exam.duration_minutes) || 0,
            endTime: exam.end_time,
            rpcValue: student.time_left_seconds,
            status: student.status,
          })
        : student.time_left_seconds,
  }));

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
            {monitorRows.map((s) => (
              <tr key={`${s.email}-${s.attempt_id ?? "none"}`} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                <td>
                  <p className="font-medium">{s.student_name}</p>
                  <p className="text-xs text-slate-400">{s.email}</p>
                </td>
                <td><span className="badge bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">{s.status}</span></td>
                <td>{formatSeconds(s.display_time_left_seconds)}</td>
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

function sessionDurationSeconds(session: AttemptSessionRow) {
  const started = new Date(session.started_at).getTime();
  const ended = new Date(session.ended_at ?? session.last_seen_at ?? new Date()).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(ended)) return 0;
  return Math.max(0, Math.floor((ended - started) / 1000));
}

function getPausableTimeLeft({
  activeSeconds,
  durationMinutes,
  endTime,
  rpcValue,
  status,
}: {
  activeSeconds: number | undefined;
  durationMinutes: number;
  endTime: string | null;
  rpcValue: number | null;
  status: string;
}) {
  if (status !== "in_progress") return null;
  if (activeSeconds == null) return rpcValue;

  const durationLeft = Math.max(0, durationMinutes * 60 - activeSeconds);
  if (!endTime) return durationLeft;

  const windowLeft = Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 1000));
  return Math.min(durationLeft, windowLeft);
}

function formatSeconds(value: number | null) {
  if (value == null) return "-";
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
