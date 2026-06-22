"use client";

import { useState } from "react";
import { saveInstructions } from "./actions";

export default function InstructionsForm({
  examId,
  initialInstructions,
}: {
  examId: string;
  initialInstructions: string;
}) {
  const [value, setValue] = useState(initialInstructions);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.set("exam_id", examId);
    form.set("instructions", value);
    const res = await saveInstructions(form);
    setBusy(false);
    setOk(res.ok);
    setMessage(res.message);
  };

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Exam instructions
        </label>
        <p className="mb-3 text-xs text-slate-500">
          Aa instructions student ne exam start karta pehla intro page par dekhashe.
          Dareko point alag line par lakho.
        </p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={12}
          placeholder={
            "Example:\n• Total questions: 50\n• Time: 60 minutes\n• Each wrong answer ma negative marking che\n• Tab switch / cheating allowed nathi\n• Submit karta pehla badha answers check karo"
          }
          className="input font-mono text-sm leading-relaxed"
        />
      </div>

      <div className="flex items-center gap-3">
        <button disabled={busy} className="btn-primary disabled:opacity-40">
          {busy ? "Saving..." : "Save instructions"}
        </button>
        {message && (
          <p
            className={`rounded-md px-3 py-1.5 text-sm ${
              ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
