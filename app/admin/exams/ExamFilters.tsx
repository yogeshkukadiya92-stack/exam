"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, BarChart3, Eye, EyeOff, Trash2, Search } from "lucide-react";
import { deleteExam, togglePublish } from "./actions";
import DuplicateExamButton from "./DuplicateExamButton";

interface Exam {
  id: string;
  title: string;
  is_published: boolean;
  duration_minutes: number;
  negative_marking: boolean;
  course_id: string;
  batch_id: string;
  courseName: string;
  batchName: string;
  qCount: number;
}

interface Props {
  exams: Exam[];
  courses: { id: string; name: string }[];
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
      {/* Filter controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
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
          className="input py-2.5 min-w-[160px]"
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
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

      {/* Exam list */}
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
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-slate-900 truncate">
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
                </div>
                <p className="mt-0.5 text-sm text-slate-500">
                  {e.courseName} · {e.batchName}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {e.qCount} questions · {e.duration_minutes} min
                  {e.negative_marking ? " · negative marking" : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link
                  href={`/admin/exams/${e.id}/questions`}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Questions
                </Link>
                <Link
                  href={`/admin/exams/${e.id}/results`}
                  className="btn-secondary flex items-center gap-1.5 text-xs"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Results
                </Link>
                <DuplicateExamButton
                  examId={e.id}
                  batches={batches}
                  currentBatchId={e.batch_id}
                />
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
