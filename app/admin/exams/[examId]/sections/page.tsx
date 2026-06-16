import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addSection, deleteSection } from "./actions";
import { Trash2 } from "lucide-react";

export default async function SectionsPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const supabase = await createClient();
  const { data: exam } = await supabase.from("exams").select("title").eq("id", examId).single();
  if (!exam) notFound();

  const { data: sections } = await supabase
    .from("sections")
    .select("id, name, position, marks, duration_minutes, questions(count)")
    .eq("exam_id", examId)
    .order("position");

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/exams" className="text-sm text-slate-500 hover:text-indigo-600">Back to exams</Link>
        <h1 className="page-title mt-2">{exam.title} Sections</h1>
      </div>

      <form action={addSection} className="card mb-6 grid gap-3 p-5 md:grid-cols-5">
        <input type="hidden" name="exam_id" value={examId} />
        <input name="name" required placeholder="Section name" className="input md:col-span-2" />
        <input name="position" type="number" placeholder="Order" className="input" />
        <input name="marks" type="number" placeholder="Marks" className="input" />
        <input name="duration_minutes" type="number" placeholder="Timer min" className="input" />
        <button className="btn-primary md:col-span-5">Add section</button>
      </form>

      <div className="space-y-3">
        {(sections ?? []).map((s) => (
          <div key={s.id} className="card-hover flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-slate-500">
                Order {s.position ?? 0} · {s.marks ?? 0} marks · {s.duration_minutes ? `${s.duration_minutes} min` : "No section timer"} · {(s.questions as { count: number }[] | null)?.[0]?.count ?? 0} questions
              </p>
            </div>
            <form action={deleteSection}>
              <input type="hidden" name="exam_id" value={examId} />
              <input type="hidden" name="id" value={s.id} />
              <button className="btn-danger p-2"><Trash2 className="h-4 w-4" /></button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
