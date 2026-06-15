"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateExam } from "./actions";

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
  course_id: string;
  batch_id: string;
  instructions: string | null;
  duration_minutes: number;
  pass_marks: number;
  negative_marking: boolean;
  shuffle_questions: boolean;
  proctoring: boolean;
  max_attempts: number;
  start_time: string | null;
  end_time: string | null;
}

export default function EditExamButton({
  exam,
  courses,
}: {
  exam: Exam;
  courses: Course[];
}) {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState(exam.course_id);
  const batches = courses.find((c) => c.id === courseId)?.batches ?? [];
  const label = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary flex items-center gap-1.5 text-xs"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/30 px-4 py-8">
          <form action={updateExam} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="section-title">Edit exam</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input type="hidden" name="id" value={exam.id} />

            <div className="space-y-5">
              <div>
                <label className={label}>Exam title</label>
                <input name="title" required defaultValue={exam.title} className="input" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Course</label>
                  <select
                    name="course_id"
                    required
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className="input"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Batch</label>
                  <select name="batch_id" required defaultValue={exam.batch_id} className="input">
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={label}>Duration (min)</label>
                  <input name="duration_minutes" type="number" min={1} defaultValue={exam.duration_minutes} className="input" />
                </div>
                <div>
                  <label className={label}>Pass marks</label>
                  <input name="pass_marks" type="number" min={0} step="0.01" defaultValue={exam.pass_marks} className="input" />
                </div>
                <div>
                  <label className={label}>Max attempts</label>
                  <input name="max_attempts" type="number" min={1} defaultValue={exam.max_attempts} className="input" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Start time</label>
                  <input name="start_time" type="datetime-local" defaultValue={toDateTimeLocal(exam.start_time)} className="input" />
                </div>
                <div>
                  <label className={label}>End time</label>
                  <input name="end_time" type="datetime-local" defaultValue={toDateTimeLocal(exam.end_time)} className="input" />
                </div>
              </div>

              <div>
                <label className={label}>Instructions</label>
                <textarea name="instructions" rows={2} defaultValue={exam.instructions ?? ""} className="input" />
              </div>

              <div className="flex flex-wrap gap-5 rounded-xl bg-slate-50 p-4">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="negative_marking" defaultChecked={exam.negative_marking} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Negative marking
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="shuffle_questions" defaultChecked={exam.shuffle_questions} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Shuffle questions
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
                  <input type="checkbox" name="proctoring" defaultChecked={exam.proctoring} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  Anti-cheat
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button className="btn-primary">Save changes</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}
