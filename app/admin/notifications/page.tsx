import { createClient } from "@/lib/supabase/server";
import { queueNotification } from "./actions";

interface NotificationEventRow {
  id: string;
  event_type: string;
  recipient: string | null;
  subject: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("notification_events")
    .select("id, event_type, recipient, subject, status, error, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (events as NotificationEventRow[] | null) ?? [];

  return (
    <div>
      <h1 className="page-title">Notifications</h1>
      <p className="mt-1 text-sm text-slate-500">Email outbox and manual notification queue.</p>

      <form action={queueNotification} className="card my-6 grid gap-3 p-5 md:grid-cols-2">
        <select name="event_type" className="input" defaultValue="manual">
          <option value="manual">Manual</option>
          <option value="exam_published">Exam published</option>
          <option value="result_declared">Result declared</option>
          <option value="student_added">Student added</option>
        </select>
        <input name="recipient" placeholder="Recipient email" className="input" />
        <input name="subject" placeholder="Subject" className="input md:col-span-2" />
        <textarea name="body" rows={3} placeholder="Message body" className="input md:col-span-2" />
        <button className="btn-primary md:col-span-2">Queue notification</button>
      </form>

      <div className="table-shell">
        <table className="admin-table min-w-[720px]">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/70">
            <tr>
              <th>Type</th>
              <th>Recipient</th>
              <th>Subject</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.map((e) => (
              <tr key={e.id} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                <td>{e.event_type}</td>
                <td>{e.recipient ?? "-"}</td>
                <td className="max-w-xs truncate">{e.subject ?? "-"}</td>
                <td><span className="badge bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">{e.status}</span></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-sm text-slate-500">
                  No notification events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
