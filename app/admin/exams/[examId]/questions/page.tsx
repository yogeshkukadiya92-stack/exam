import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FileText, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import QuestionForm from "./QuestionForm";
import ExcelQuestionUpload from "./ExcelQuestionUpload";
import QuestionBankPicker from "./QuestionBankPicker";
import EditQuestionButton from "./EditQuestionButton";
import CaseStudyExcelUpload from "../case-studies/CaseStudyExcelUpload";
import WordPracticalUpload from "./WordPracticalUpload";
import { deleteQuestion } from "./actions";

interface CaseStudyRow {
  id: string;
  title: string;
  position: number | null;
}

interface OptionRow {
  id: string;
  option_text: string;
  is_correct: boolean;
  position: number;
}

interface QuestionRow {
  id: string;
  case_study_id: string | null;
  question_text: string;
  type: string;
  marks: number | string;
  negative_marks: number | string;
  explanation: string | null;
  correct_text: string | null;
  case_studies: CaseStudyRow | null;
  options: OptionRow[] | null;
}

export default async function ExamQuestionsPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const supabase = await createClient();

  const { data: exam } = await supabase
    .from("exams")
    .select("id, title, exam_mode")
    .eq("id", examId)
    .single();

  if (!exam) notFound();

  const [questionsQuery, { data: bankQuestions }, caseStudiesQuery] =
    await Promise.all([
      supabase
        .from("questions")
        .select("id, case_study_id, question_text, type, marks, negative_marks, explanation, correct_text, case_studies(id, title, position), options(id, option_text, is_correct, position)")
        .eq("exam_id", examId)
        .order("created_at", { ascending: true }),
      supabase
        .from("question_bank")
        .select("id, question_text, subject, topic, difficulty, type, marks")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("case_studies")
        .select("id, title, position")
        .eq("exam_id", examId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);
  const fallbackQuestionsQuery = questionsQuery.error
    ? await supabase
        .from("questions")
        .select("id, question_text, type, marks, negative_marks, explanation, correct_text, options(id, option_text, is_correct, position)")
        .eq("exam_id", examId)
        .order("created_at", { ascending: true })
    : null;

  const questionRows =
    ((questionsQuery.data ?? fallbackQuestionsQuery?.data) as QuestionRow[] | null) ?? [];
  const caseStudyRows = (caseStudiesQuery.data as CaseStudyRow[] | null) ?? [];
  const totalMarks = questionRows.reduce((sum, q) => sum + Number(q.marks), 0);

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/admin/exams" className="transition-colors hover:text-indigo-600">
          Exams
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-slate-700">{exam.title}</span>
      </div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{exam.title} Questions</h1>
          <p className="mt-1 text-sm text-slate-500">
            {questionRows.length} questions - {totalMarks} marks total
          </p>
        </div>
        {exam.exam_mode === "practical" && (
          <Link
            href={`/admin/exams/${examId}/case-studies`}
            className="btn-secondary"
          >
            Manage case studies
          </Link>
        )}
      </div>

      <ExcelQuestionUpload examId={examId} />
      {exam.exam_mode === "practical" && (
        <>
          <CaseStudyExcelUpload examId={examId} />
          <WordPracticalUpload examId={examId} />
        </>
      )}
      <QuestionBankPicker
        examId={examId}
        questions={(bankQuestions as never) ?? []}
      />
      <QuestionForm examId={examId} caseStudies={caseStudyRows} />

      <div className="space-y-3">
        {questionRows.map((q, idx) => {
          const opts = [...(q.options ?? [])].sort((a, b) => a.position - b.position);

          return (
            <div key={q.id} className="card-hover p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium text-slate-900">
                  <span className="text-slate-400">{idx + 1}.</span> {q.question_text}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <EditQuestionButton
                    examId={examId}
                    caseStudies={caseStudyRows}
                    question={{
                      id: q.id,
                      case_study_id: q.case_study_id ?? null,
                      question_text: q.question_text,
                      type: q.type,
                      marks: Number(q.marks),
                      negative_marks: Number(q.negative_marks),
                      explanation: q.explanation ?? null,
                      correct_text: q.correct_text ?? null,
                      options: opts.map((o) => ({
                        option_text: o.option_text,
                        is_correct: o.is_correct,
                        position: o.position,
                      })),
                    }}
                  />
                  <form action={deleteQuestion}>
                    <input type="hidden" name="id" value={q.id} />
                    <input type="hidden" name="exam_id" value={examId} />
                    <button className="rounded-lg border border-red-200 p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </div>

              <ul className="mt-3 space-y-1.5 text-sm">
                {opts.map((o) => (
                  <li
                    key={o.id}
                    className={`flex items-center gap-2 ${
                      o.is_correct ? "font-medium text-emerald-600" : "text-slate-500"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                        o.is_correct
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {o.is_correct ? "C" : "-"}
                    </span>
                    {o.option_text}
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {q.case_studies && (
                  <span className="badge bg-cyan-50 text-cyan-700">
                    {q.case_studies.title}
                  </span>
                )}
                <span className="badge bg-slate-100 text-slate-600">+{q.marks} marks</span>
                {Number(q.negative_marks) > 0 && (
                  <span className="badge bg-red-50 text-red-600">-{q.negative_marks} negative</span>
                )}
                <span className="badge bg-slate-100 text-slate-500">{q.type}</span>
              </div>
            </div>
          );
        })}

        {questionRows.length === 0 && (
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
