"use client";

import { useState } from "react";

export default function BatchPicker({ batches, selected, onChange }: {
  batches: { id: string; name: string }[];
  selected?: string[];
  onChange?: (ids: string[]) => void;
}) {
  const [localIds, setLocalIds] = useState<string[]>([]);
  const ids = selected ?? localIds;
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-slate-700">Batches</legend>
      <p className="mb-2 text-xs text-slate-500">Select one or more batches for this exam.</p>
      <p className="mb-2 text-xs font-medium text-slate-600" aria-live="polite">
        {ids.length} {ids.length === 1 ? "batch" : "batches"} selected
      </p>
      <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
        {batches.length === 0 && <p className="p-2 text-sm text-slate-500">Select a course to see its batches.</p>}
        {batches.map((batch) => (
          <label key={batch.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm hover:bg-indigo-50">
            <input type="checkbox" name="batch_ids" value={batch.id} checked={ids.includes(batch.id)}
              onChange={(event) => {
                const next = event.target.checked ? [...ids, batch.id] : ids.filter((id) => id !== batch.id);
                setLocalIds(next);
                onChange?.(next);
              }} className="h-4 w-4 accent-indigo-600" />
            {batch.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
