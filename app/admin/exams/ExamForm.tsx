"use client";

import { useState } from "react";
import { createExam } from "./actions";
import { Plus, X } from "lucide-react";

interface Batch {
  id: string;
  name: string;
}
interface Course {
  id: string;
  name: string;
  batches: Batch[];
}

export default function ExamForm({ courses }: { courses: Course[] }) {
  const [open, setOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [examMode, setExamMode] = useState<"standard" | "practical">("standard");
  const [timerMode, setTimerMode] = useState<"continuous" | "pausable">("continuous");

  const batches = courses.find((c) => c.id === courseId)?.batches ?? [];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-primary mb-8 flex items-center gap-1.5"
      >
        <Plus className="h-4 w-4" />
        Create new exam
      </button>
    );
  }

  const label = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <form
      action={createExam}
      className="card mb-8 space-y-5 p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="section-title">New exam</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div>
        <label className={label}>Exam title</label>
        <input name="title" required placeholder="e.g. Physics Unit Test 1" className="input" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Exam type</label>
          <select
            name="exam_mode"
            value={examMode}
            onChange={(e) => {
              const next = e.target.value === "practical" ? "practical" : "standard";
              setExamMode(next);
              setTimerMode(next === "practical" ? "pausable" : "continuous");
            }}
            className="input"
          >
            <option value="standard">Standard</option>
            <option value="practical">Practical / Case study</option>
          </select>
        </div>
        <div>
          <label className={label}>
            {examMode === "practical" ? "Active duration (min)" : "Duration (min)"}
          </label>
          <input name="duration_minutes" type="number" min={1} defaultValue={60} className="input" />
        </div>
        <div>
          <label className={label}>Timer</label>
          <select
            name="timer_mode"
            value={timerMode}
            onChange={(e) =>
              setTimerMode(e.target.value === "continuous" ? "continuous" : "pausable")
            }
            className="input"
            disabled={examMode !== "practical"}
          >
            <option value="continuous">Continuous</option>
            <option value="pausable">Pausable</option>
          </select>
        </div>
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
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Batch</label>
          <select name="batch_id" required className="input" disabled={!courseId}>
            <option value="">Select batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Pass marks</label>
          <input name="pass_marks" type="number" min={0} step="0.01" defaultValue={0} className="input" />
        </div>
        <div>
          <label className={label}>Max attempts</label>
          <input name="max_attempts" type="number" min={1} defaultValue={1} className="input" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Start time (optional)</label>
          <input name="start_time" type="datetime-local" className="input" />
        </div>
        <div>
          <label className={label}>End time (optional)</label>
          <input name="end_time" type="datetime-local" className="input" />
        </div>
      </div>

      <div>
        <label className={label}>Instructions (optional)</label>
        <textarea
          name="instructions"
          rows={2}
          placeholder="Instructions shown to students before the exam..."
          className="input"
        />
      </div>

      <div className="flex flex-wrap gap-5 rounded-xl bg-slate-50 p-4">
        <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" name="negative_marking" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Negative marking
        </label>
        <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" name="shuffle_questions" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Shuffle questions
        </label>
        <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" name="proctoring" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Anti-cheat (proctoring)
        </label>
        <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" name="show_correct_answers" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Show correct answers
        </label>
        <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" name="show_explanations" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Show explanations
        </label>
        <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
          <input type="checkbox" name="result_visible" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
          Result visible
        </label>
        {examMode === "practical" && (
          <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer">
            <input type="checkbox" name="allow_case_navigation" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            Free case navigation
          </label>
        )}
      </div>

      <button className="btn-primary">Create exam</button>
    </form>
  );
}
