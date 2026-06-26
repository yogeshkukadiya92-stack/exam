"use client";

import { Trash2 } from "lucide-react";
import { permanentlyDeleteExam } from "../actions";

export default function ConfirmDeleteButton({
  examId,
  title,
}: {
  examId: string;
  title: string;
}) {
  return (
    <form
      action={permanentlyDeleteExam}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Delete "${title}" permanently? This cannot be recovered.`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={examId} />
      <button className="btn-danger flex items-center gap-1.5 text-xs">
        <Trash2 className="h-3.5 w-3.5" />
        Delete permanently
      </button>
    </form>
  );
}
