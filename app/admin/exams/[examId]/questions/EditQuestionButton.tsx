"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateQuestion } from "./actions";

interface Option {
  option_text: string;
  is_correct: boolean;
  position: number;
}

interface Question {
  id: string;
  question_text: string;
  type: string;
  marks: number;
  negative_marks: number;
  explanation: string | null;
  correct_text: string | null;
  options: Option[];
}

export default function EditQuestionButton({
  examId,
  question,
}: {
  examId: string;
  question: Question;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(question.type);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const input =
    "w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400";

  // Prefill option text/correct by position (0..3)
  const optAt = (i: number) =>
    question.options.find((o) => o.position === i) ??
    question.options[i] ??
    null;

  const openModal = () => {
    setType(question.type);
    setMessage(null);
    setOk(false);
    setOpen(true);
  };

  const isMcq = type === "single" || type === "multiple" || type === "true_false";

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/30 px-4 py-8">
          <form
            action={async (fd) => {
              setBusy(true);
              setMessage(null);
              const result = await updateQuestion(fd);
              setBusy(false);
              setOk(result.ok);
              setMessage(result.message);
              if (result.ok) {
                window.setTimeout(() => setOpen(false), 500);
              }
            }}
            className="w-full max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Edit question</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input type="hidden" name="id" value={question.id} />
            <input type="hidden" name="exam_id" value={examId} />

            <textarea
              name="question_text"
              required
              rows={2}
              defaultValue={question.question_text}
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
            </div>

            {isMcq && (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => {
                  const o = optAt(i);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name={`correct_${i}`}
                        defaultChecked={o?.is_correct ?? false}
                        className="h-4 w-4 shrink-0"
                        title="Correct?"
                      />
                      <input
                        name={`option_${i}`}
                        defaultValue={o?.option_text ?? ""}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        className={input}
                      />
                    </div>
                  );
                })}
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
                  defaultValue={question.correct_text ?? ""}
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
                  defaultValue={question.marks}
                  className={input}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Negative marks</label>
                <input
                  name="negative_marks"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={question.negative_marks}
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
                defaultValue={question.explanation ?? ""}
                placeholder="Shown during review..."
                className={input}
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              {message && (
                <p
                  className={`mr-auto rounded-md px-3 py-1.5 text-sm ${
                    ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {message}
                </p>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
              >
                {busy ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
