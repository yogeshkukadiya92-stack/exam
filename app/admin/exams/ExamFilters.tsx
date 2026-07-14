"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Monitor,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { deleteExam, togglePublish } from "./actions";
import DuplicateExamButton from "./DuplicateExamButton";
import ExamLinkButton from "./ExamLinkButton";
import EditExamButton from "./EditExamButton";

interface Batch {
  id: string;
  name: string;
}

interface Course {
  id: string;
  name: string;
  batches: Batch[];
}

interface Exam {
  id: string;
  title: string;
  instructions: string | null;
  is_published: boolean;
  duration_minutes: number;
  pass_marks: number;
  negative_marking: boolean;
  shuffle_questions: boolean;
  proctoring: boolean;
  show_correct_answers: boolean;
  show_explanations: boolean;
  result_visible: boolean;
  exam_mode: string;
  timer_mode: string;
  allow_case_navigation: boolean;
  max_attempts: number;
  start_time: string | null;
  end_time: string | null;
  course_id: string;
  batch_id: string;
  courseName: string;
  batchName: string;
  qCount: number;
}

interface Props {
  exams: Exam[];
  courses: Course[];
  batches: { id: string; label: string }[];
}

export default function ExamFilters({ exams, courses, batches }: Props) {
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const filtered = exams.filter((e) => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (courseFilter && e.course_id !== courseFilter) return false;
    if (statusFilter === "published" && !e.is_published) return false;
    if (statusFilter === "draft" && e.is_published) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search exams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="input min-w-[160px] py-2.5"
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          {(["all", "published", "draft"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-indigo-100 text-indigo-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="card p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No exams match your filters.
            </p>
          </div>
        )}

        {filtered.map((e) => (
          <div key={e.id} className="card-hover p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="truncate font-semibold text-slate-900">
                    {e.title}
                  </span>
                  <span
                    className={`badge ${
                      e.is_published
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {e.is_published ? "Published" : "Draft"}
                  </span>
                  {e.exam_mode === "practical" && (
                    <span className="badge bg-cyan-50 text-cyan-700">
                      Practical
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {e.courseName} - {e.batchName}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {e.qCount} questions - {e.duration_minutes} min
                  {e.negative_marking ? " - negative marking" : ""}
                  {e.exam_mode === "practical"
                    ? ` - ${e.timer_mode === "pausable" ? "pausable" : "continuous"} timer`
                    : ""}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:max-w-[680px] xl:justify-end">
                <Link
                  href={`/admin/exams/${e.id}/questions`}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Questions
                </Link>
                <Link
                  href={`/admin/exams/${e.id}/preview`}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Link>
                {e.exam_mode === "practical" && (
                  <Link
                    href={`/admin/exams/${e.id}/case-studies`}
                    className="btn-secondary flex items-center gap-1.5 text-xs"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Cases
                  </Link>
                )}
                <Link
                  href={`/admin/exams/${e.id}/sections`}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Sections
                </Link>
                <Link
                  href={`/admin/exams/${e.id}/instructions`}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Instructions
                </Link>
                <Link
                  href={`/admin/exams/${e.id}/results`}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Results
                </Link>
                <Link
                  href={`/admin/exams/${e.id}/monitor`}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Live
                </Link>
                <Link
                  href={`/admin/exams/${e.id}/controls`}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Controls
                </Link>
                <DuplicateExamButton
                  examId={e.id}
                  batches={batches}
                  currentBatchId={e.batch_id}
                />
                <ExamLinkButton examId={e.id} isPublished={e.is_published} />
                <EditExamButton exam={e} courses={courses} />
                <form action={togglePublish}>
                  <input type="hidden" name="id" value={e.id} />
                  <input
                    type="hidden"
                    name="publish"
                    value={(!e.is_published).toString()}
                  />
                  <button className="btn-secondary flex items-center gap-1.5 text-xs">
                    {e.is_published ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" /> Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" /> Publish
                      </>
                    )}
                  </button>
                </form>
                <form action={deleteExam}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="btn-danger flex items-center gap-1 text-xs">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
