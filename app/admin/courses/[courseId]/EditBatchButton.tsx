"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateBatch } from "../actions";

interface Props {
  id: string;
  courseId: string;
  name: string;
}

export default function EditBatchButton({ id, courseId, name }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateBatch(formData);
        setOpen(false);
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="course_id" value={courseId} />
      <input
        name="name"
        required
        defaultValue={name}
        className="input py-1.5 text-sm"
        autoFocus
      />
      <button type="submit" className="btn-primary text-xs py-1.5 px-3">
        Save
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
