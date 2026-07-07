import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronRight, FileText, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import CaseStudyExcelUpload from "./CaseStudyExcelUpload";
import { addCaseStudy, deleteCaseStudy, updateCaseStudy } from "./actions";

interface CaseStudyRow {
  id: string;
  title: string;
  content: string;
  position: number | null;
  questions: { count: number }[] | null;
}

export default async function CaseStudiesPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const supabase = await createClient();

  const [{ data: exam }, { data: caseStudies }] = await Promise.all([
    supabase
      .from("exams")
      .select("id, title, exam_mode")
      .eq("id", examId)
      .single(),
    supabase
      .from("case_studies")
      .select("id, title, content, position, questions(count)")
      .eq("exam_id", examId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!exam) notFound();

  const rows = (caseStudies as CaseStudyRow[] | null) ?? [];
  const label = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-sm text-slate-500">
        <Link href="/admin/exams" className="transition-colors hover:text-indigo-600">
          Exams
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-slate-700">{exam.title}</span>
      </div>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{exam.title} Case Studies</h1>
          <p className="mt-1 text-sm text-slate-500">
            {rows.length} case {rows.length === 1 ? "study" : "studies"}
          </p>
        </div>
        <Link
          href={`/admin/exams/${examId}/questions`}
          className="btn-secondary flex items-center gap-1.5"
        >
          <FileText className="h-4 w-4" />
          Questions
        </Link>
      </div>

      {exam.exam_mode !== "practical" && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          This exam is currently set as Standard. Change the exam type to Practical to use the split case-study runner.
        </div>
      )}

      <CaseStudyExcelUpload examId={examId} />

      <form action={addCaseStudy} className="card mb-6 space-y-4 p-5">
        <input type="hidden" name="exam_id" value={examId} />
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-indigo-500" />
          <h2 className="section-title">Add case study</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div>
            <label className={label}>Title</label>
            <input name="title" required placeholder="Case Study 1" className="input" />
          </div>
          <div>
            <label className={label}>Order</label>
            <input name="position" type="number" defaultValue={rows.length + 1} className="input" />
          </div>
        </div>
        <div>
          <label className={label}>Content</label>
          <textarea
            name="content"
            required
            rows={8}
            placeholder="Paste the case study, scenario, chart notes, or instructions..."
            className="input"
          />
        </div>
        <button className="btn-primary">Add case study</button>
      </form>

      <div className="space-y-3">
        {rows.map((study) => {
          const questionCount = study.questions?.[0]?.count ?? 0;

          return (
            <div key={study.id} className="card-hover p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge bg-slate-100 text-slate-600">
                      Order {study.position ?? 0}
                    </span>
                    <span className="badge bg-indigo-50 text-indigo-700">
                      {questionCount} questions
                    </span>
                  </div>
                  <h2 className="mt-2 font-semibold text-slate-900">
                    {study.title}
                  </h2>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-slate-500">
                    {study.content}
                  </p>
                </div>
                <form action={deleteCaseStudy}>
                  <input type="hidden" name="exam_id" value={examId} />
                  <input type="hidden" name="id" value={study.id} />
                  <button className="btn-danger flex items-center gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </form>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-indigo-600">
                  Edit case study
                </summary>
                <form action={updateCaseStudy} className="mt-4 space-y-4">
                  <input type="hidden" name="exam_id" value={examId} />
                  <input type="hidden" name="id" value={study.id} />
                  <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                    <div>
                      <label className={label}>Title</label>
                      <input name="title" required defaultValue={study.title} className="input" />
                    </div>
                    <div>
                      <label className={label}>Order</label>
                      <input name="position" type="number" defaultValue={study.position ?? 0} className="input" />
                    </div>
                  </div>
                  <div>
                    <label className={label}>Content</label>
                    <textarea
                      name="content"
                      required
                      rows={8}
                      defaultValue={study.content}
                      className="input"
                    />
                  </div>
                  <button className="btn-primary">Save case study</button>
                </form>
              </details>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="card p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No case studies yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
