import Link from "next/link";
import { ArrowLeft, RotateCcw, Trash2, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { restoreExam } from "../actions";
import ConfirmDeleteButton from "./ConfirmDeleteButton";

export default async function ExamTrashPage() {
  const supabase = await createClient();

  const { data: exams } = await supabase
    .from("exams")
    .select("id, title, deleted_at, courses(name), batches(name), questions(count)")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  const list =
    exams?.map((e) => ({
      id: e.id,
      title: e.title,
      deleted_at: e.deleted_at as string | null,
      courseName: (e.courses as unknown as { name: string } | null)?.name ?? "",
      batchName: (e.batches as unknown as { name: string } | null)?.name ?? "",
      qCount: (e.questions as { count: number }[] | null)?.[0]?.count ?? 0,
    })) ?? [];

  return (
    <div>
      <Link
        href="/admin/exams"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft className="h-4 w-4" /> Back to exams
      </Link>

      <div className="mb-8">
        <h1 className="page-title">Trash</h1>
        <p className="mt-1 text-sm text-slate-500">
          Deleted exams. Restore karo athva kayma mate remove karo.
        </p>
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="card p-12 text-center">
            <Trash2 className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Trash khali che.</p>
          </div>
        )}

        {list.map((e) => (
          <div key={e.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{e.title}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {e.courseName} · {e.batchName}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                  <FileText className="h-3.5 w-3.5" />
                  {e.qCount} questions
                  {e.deleted_at ? ` · deleted ${formatDate(e.deleted_at)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <form action={restoreExam}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="btn-secondary flex items-center gap-1.5 text-xs">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                </form>
                <ConfirmDeleteButton examId={e.id} title={e.title} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
