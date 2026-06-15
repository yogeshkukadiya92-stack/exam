import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuestionForm from "./QuestionForm";
import ExcelQuestionUpload from "./ExcelQuestionUpload";
import { deleteQuestion } from "./actions";
import { ChevronRight, Trash2, FileText } from "lucide-react";

export default async function ExamQuestionsPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("id, title")
    .eq("id", examId)
    .single();

  if (!exam) notFound();

  const { data: questions } = await supabase
    .from("questions")
    .select("id, question_text, type, marks, negative_marks, options(id, option_text, is_correct, position)")
    .eq("exam_id", examId)
    .order("created_at", { ascending: true });

  const totalMarks =
    questions?.reduce((sum, q) => sum + Number(q.marks), 0) ?? 0;

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/admin/exams" className="hover:text-indigo-600 transition-colors">
          Exams
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-slate-700 font-medium">{exam.title}</span>
      </div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="page-title">{exam.title} — Questions</h1>
          <p className="mt-1 text-sm text-slate-500">
            {questions?.length ?? 0} questions · {totalMarks} marks total
          </p>
        </div>
      </div>

      <ExcelQuestionUpload examId={examId} />
      <QuestionForm examId={examId} />

      <div className="space-y-3">
        {questions?.map((q, idx) => {
          const opts = (
            (q.options as {
              id: string;
              option_text: string;
              is_correct: boolean;
              position: number;
            }[]) ?? []
          ).sort((a, b) => a.position - b.position);
          return (
            <div key={q.id} className="card-hover p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-900">
                  <span className="text-slate-400">{idx + 1}.</span> {q.question_text}
                </p>
                <form action={deleteQuestion} className="shrink-0">
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="exam_id" value={examId} />
                  <button className="rounded-lg border border-red-200 p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {opts.map((o) => (
                  <li
                    key={o.id}
                    className={`flex items-center gap-2 ${
                      o.is_correct ? "text-emerald-600 font-medium" : "text-slate-500"
                    }`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      o.is_correct
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {o.is_correct ? "✓" : "·"}
                    </span>
                    {o.option_text}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-2">
                <span className="badge bg-slate-100 text-slate-600">+{q.marks} marks</span>
                {Number(q.negative_marks) > 0 && (
                  <span className="badge bg-red-50 text-red-600">-{q.negative_marks} negative</span>
                )}
                <span className="badge bg-slate-100 text-slate-500">{q.type}</span>
              </div>
            </div>
          );
        })}
        {questions?.length === 0 && (
          <div className="card p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No questions yet. Add them above or use Excel bulk upload.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
