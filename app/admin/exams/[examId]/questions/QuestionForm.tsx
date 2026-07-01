"use client";

import { useState } from "react";
import { addQuestion } from "./actions";

interface CaseStudy {
  id: string;
  title: string;
  position: number | null;
}

export default function QuestionForm({
  examId,
  caseStudies,
}: {
  examId: string;
  caseStudies: CaseStudy[];
}) {
  const [type, setType] = useState("single");
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const input =
    "w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400";

  return (
    <form
      action={async (fd) => {
        setBusy(true);
        setMessage(null);
        const result = await addQuestion(fd);
        setBusy(false);
        setOk(result.ok);
        setMessage(result.message);
        if (result.ok) {
          // form reset (uncontrolled fields)
          (document.getElementById("qform") as HTMLFormElement)?.reset();
          setType("single");
        }
      }}
      id="qform"
      className="mb-6 space-y-4 rounded-xl border bg-white p-5"
    >
      <h2 className="font-medium">Add question</h2>
      <input type="hidden" name="exam_id" value={examId} />

      {caseStudies.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium">Case study</label>
          <select name="case_study_id" className={input} defaultValue="">
            <option value="">No case study</option>
            {caseStudies.map((study) => (
              <option key={study.id} value={study.id}>
                {study.position ?? 0}. {study.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <textarea
        name="question_text"
        required
        rows={2}
        placeholder="Write the question..."
        className={input}
      />

      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">Type:</span>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border px-2 py-1.5 text-sm"
        >
          <option value="single">Single correct</option>
          <option value="multiple">Multiple correct</option>
          <option value="true_false">True / False</option>
          <option value="fill_blank">Fill in blank</option>
          <option value="numerical">Numerical</option>
          <option value="descriptive">Descriptive</option>
        </select>
        <span className="text-xs text-gray-400">
          {type === "single"
            ? "(mark exactly one correct option)"
            : type === "multiple"
            ? "(you can mark more than one correct option)"
            : "(enter the correct text below for text or numerical answers)"}
        </span>
      </div>

      {(type === "single" || type === "multiple" || type === "true_false") && (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="checkbox"
              name={`correct_${i}`}
              defaultChecked={type === "true_false" && i === 0}
              className="h-4 w-4 shrink-0"
              title="Correct?"
            />
            <input
              name={`option_${i}`}
              defaultValue={type === "true_false" ? (i === 0 ? "True" : i === 1 ? "False" : "") : ""}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              className={input}
            />
          </div>
        ))}
        <p className="text-xs text-gray-400">
          Checkbox = correct answer. Add at least 2 options and 1 correct answer.
        </p>
      </div>
      )}

      {(type === "fill_blank" || type === "numerical" || type === "descriptive") && (
        <div>
          <label className="mb-1 block text-sm font-medium">
            Correct answer / grading note
          </label>
          <input
            name="correct_text"
            placeholder={type === "descriptive" ? "Manual grading note" : "Correct answer"}
            className={input}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Marks</label>
          <input
            name="marks"
            type="number"
            min={0}
            step="0.01"
            defaultValue={1}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Negative marks
          </label>
          <input
            name="negative_marks"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            className={input}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Explanation (optional)
        </label>
        <textarea
          name="explanation"
          rows={2}
          placeholder="Shown during review..."
          className={input}
        />
      </div>

      {message && (
        <p
          className={`rounded-md p-2 text-sm ${
            ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </p>
      )}

      <button
        disabled={busy}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
      >
        {busy ? "Adding..." : "Add question"}
      </button>
    </form>
  );
}
