import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuestionForm from "./QuestionForm";
import ExcelQuestionUpload from "./ExcelQuestionUpload";
import { deleteQuestion } from "./actions";

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
      <div className="mb-1 text-sm text-gray-500">
        <Link href="/admin/exams" className="hover:underline">
          Exams
        </Link>{" "}
        / {exam.title}
      </div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{exam.title} — Questions</h1>
        <span className="text-sm text-gray-500">
          {questions?.length ?? 0} questions · {totalMarks} marks
        </span>
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
            <div key={q.id} className="rounded-xl border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">
                  {idx + 1}. {q.question_text}
                </p>
                <form action={deleteQuestion} className="shrink-0">
                  <input type="hidden" name="id" value={q.id} />
                  <input type="hidden" name="exam_id" value={examId} />
                  <button className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </form>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {opts.map((o) => (
                  <li
                    key={o.id}
                    className={
                      o.is_correct ? "text-green-700" : "text-gray-600"
                    }
                  >
                    {o.is_correct ? "✓ " : "• "}
                    {o.option_text}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-400">
                +{q.marks} marks
                {Number(q.negative_marks) > 0
                  ? ` · -${q.negative_marks} negative`
                  : ""}{" "}
                · {q.type}
              </p>
            </div>
          );
        })}
        {questions?.length === 0 && (
          <p className="text-sm text-gray-500">
            Haju koi question nathi. Upar thi add karo (athva Phase 3 ma Excel
            thi bulk upload).
          </p>
        )}
      </div>
    </div>
  );
}
