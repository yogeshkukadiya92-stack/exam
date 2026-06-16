"use client";

import { useState } from "react";
import { addBankQuestionsToExam } from "@/app/admin/question-bank/actions";

interface BankQuestion {
  id: string;
  question_text: string;
  subject: string | null;
  topic: string | null;
  difficulty: string | null;
  type: string;
  marks: number;
}

export default function QuestionBankPicker({
  examId,
  questions,
}: {
  examId: string;
  questions: BankQuestion[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary mb-6">
        Add from question bank
      </button>
    );
  }

  return (
    <form action={addBankQuestionsToExam} className="card mb-6 space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Question bank</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-500">
          Close
        </button>
      </div>
      <input type="hidden" name="exam_id" value={examId} />

      <div className="max-h-80 overflow-y-auto rounded-lg border">
        {questions.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Question bank empty chhe.</p>
        )}
        {questions.map((q) => (
          <label key={q.id} className="flex cursor-pointer gap-3 border-b p-3 last:border-b-0 hover:bg-slate-50">
            <input
              type="checkbox"
              name="question_ids"
              value={q.id}
              checked={selected.includes(q.id)}
              onChange={(e) => {
                setSelected((prev) =>
                  e.target.checked ? [...prev, q.id] : prev.filter((id) => id !== q.id)
                );
              }}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">{q.question_text}</span>
              <span className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{q.type}</span>
                {q.subject && <span>{q.subject}</span>}
                {q.topic && <span>{q.topic}</span>}
                {q.difficulty && <span>{q.difficulty}</span>}
                <span>+{q.marks}</span>
              </span>
            </span>
          </label>
        ))}
      </div>

      <button disabled={selected.length === 0} className="btn-primary disabled:opacity-40">
        Add {selected.length} selected
      </button>
    </form>
  );
}
