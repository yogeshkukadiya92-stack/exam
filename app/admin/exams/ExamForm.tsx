"use client";

import { useState } from "react";
import { createExam } from "./actions";

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

  const batches = courses.find((c) => c.id === courseId)?.batches ?? [];

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        + Navo exam banavo
      </button>
    );
  }

  const input =
    "w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400";
  const label = "block text-sm font-medium mb-1";

  return (
    <form
      action={createExam}
      className="mb-6 space-y-4 rounded-xl border bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Navo exam</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>

      <div>
        <label className={label}>Exam title</label>
        <input name="title" required placeholder="e.g. Physics Unit Test 1" className={input} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Course</label>
          <select
            name="course_id"
            required
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className={input}
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
          <select name="batch_id" required className={input} disabled={!courseId}>
            <option value="">Select batch</option>
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
          <input name="duration_minutes" type="number" min={1} defaultValue={60} className={input} />
        </div>
        <div>
          <label className={label}>Pass marks</label>
          <input name="pass_marks" type="number" min={0} step="0.01" defaultValue={0} className={input} />
        </div>
        <div>
          <label className={label}>Max attempts</label>
          <input name="max_attempts" type="number" min={1} defaultValue={1} className={input} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Start time (optional)</label>
          <input name="start_time" type="datetime-local" className={input} />
        </div>
        <div>
          <label className={label}>End time (optional)</label>
          <input name="end_time" type="datetime-local" className={input} />
        </div>
      </div>

      <div>
        <label className={label}>Instructions (optional)</label>
        <textarea
          name="instructions"
          rows={2}
          placeholder="Exam pela student ne dekhase…"
          className={input}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="negative_marking" className="h-4 w-4" />
          Negative marking
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="shuffle_questions" className="h-4 w-4" />
          Shuffle questions
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="proctoring" className="h-4 w-4" />
          Anti-cheat (proctoring)
        </label>
      </div>

      <button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
        Create exam
      </button>
    </form>
  );
}
