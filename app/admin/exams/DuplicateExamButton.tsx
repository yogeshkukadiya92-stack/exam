"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { duplicateExam } from "./actions";

interface Props {
  examId: string;
  batches: { id: string; label: string }[];
  currentBatchId: string;
}

export default function DuplicateExamButton({
  examId,
  batches,
  currentBatchId,
}: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary flex items-center gap-1.5 text-xs"
      >
        <Copy className="h-3.5 w-3.5" />
        Duplicate
      </button>
    );
  }

  return (
    <form action={duplicateExam} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="exam_id" value={examId} />
      <select
        name="batch_id"
        defaultValue={currentBatchId}
        className="input py-1.5 text-xs"
      >
        {batches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
      <select
        name="copy_questions"
        defaultValue="true"
        className="input py-1.5 text-xs"
        aria-label="Duplicate question option"
      >
        <option value="true">With questions</option>
        <option value="false">Without questions</option>
      </select>
      <button type="submit" className="btn-primary text-xs py-1.5 px-3">
        Copy
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-slate-400 hover:text-slate-600"
      >
        Cancel
      </button>
    </form>
  );
}
