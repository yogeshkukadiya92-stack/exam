"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateCourse } from "./actions";

interface Props {
  id: string;
  name: string;
  description: string | null;
}

export default function EditCourseButton({ id, name, description }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary flex items-center gap-1.5 text-sm"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateCourse(formData);
        setOpen(false);
      }}
      className="card mt-3 p-4"
    >
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="name"
          required
          defaultValue={name}
          placeholder="Course name"
          className="input flex-1"
          autoFocus
        />
        <input
          name="description"
          defaultValue={description ?? ""}
          placeholder="Description (optional)"
          className="input flex-1"
        />
        <div className="flex gap-2">
          <button type="submit" className="btn-primary text-sm">
            Save
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
