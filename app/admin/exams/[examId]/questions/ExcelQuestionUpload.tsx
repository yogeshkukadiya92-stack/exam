"use client";

import { useState, useRef } from "react";
import {
  downloadQuestionTemplate,
  parseQuestionsFile,
  type ParsedQuestion,
} from "@/lib/excel";
import { bulkAddQuestions } from "./actions";

export default function ExcelQuestionUpload({ examId }: { examId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedQuestion[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const valid = rows?.filter((r) => !r.error) ?? [];
  const invalid = rows?.filter((r) => r.error) ?? [];

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    try {
      setRows(await parseQuestionsFile(file));
    } catch {
      setResult("File read na thai. .xlsx athva .csv aapo.");
    }
  };

  const submit = async () => {
    if (valid.length === 0) return;
    setBusy(true);
    const res = await bulkAddQuestions(
      examId,
      valid.map((r) => ({
        question_text: r.question_text,
        options: r.options,
        correct: r.correct,
        marks: r.marks,
        negative_marks: r.negative_marks,
        type: r.type,
      }))
    );
    setBusy(false);
    setResult(`${res.added} questions add thaya${res.failed ? `, ${res.failed} fail` : ""}.`);
    setRows(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-3 rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
      >
        📥 Excel thi bulk upload
      </button>
    );
  }

  return (
    <div className="mb-5 space-y-3 rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Excel thi questions upload</h2>
        <button
          onClick={() => { setOpen(false); setRows(null); setResult(null); }}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={downloadQuestionTemplate}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100"
        >
          ⬇ Template download
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFile}
          className="text-sm file:mr-3 file:rounded-md file:border file:bg-gray-50 file:px-3 file:py-1.5 file:text-sm"
        />
      </div>

      <p className="text-xs text-gray-400">
        Columns: Question · OptionA–D · CorrectAnswer (A/B/C/D, multiple mate "A,C") · Marks · NegativeMarks
      </p>

      {result && (
        <p className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">{result}</p>
      )}

      {rows && (
        <div>
          <p className="mb-2 text-sm">
            <span className="text-emerald-700">{valid.length} valid</span>
            {invalid.length > 0 && (
              <span className="text-red-600"> · {invalid.length} ma error</span>
            )}
          </p>

          <div className="max-h-72 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Question</th>
                  <th className="px-3 py-2 font-medium">Correct</th>
                  <th className="px-3 py-2 font-medium">Marks</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className="border-t">
                    <td className="px-3 py-2 text-gray-400">{r.row}</td>
                    <td className="px-3 py-2">{r.question_text || "—"}</td>
                    <td className="px-3 py-2">
                      {r.correct.map((i) => String.fromCharCode(65 + i)).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2">
                      +{r.marks}
                      {r.negative_marks > 0 ? ` / -${r.negative_marks}` : ""}
                    </td>
                    <td className="px-3 py-2">
                      {r.error ? (
                        <span className="text-red-600">{r.error}</span>
                      ) : (
                        <span className="text-emerald-600">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            disabled={busy || valid.length === 0}
            onClick={submit}
            className="mt-3 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
          >
            {busy ? "Adding…" : `Add ${valid.length} questions`}
          </button>
        </div>
      )}
    </div>
  );
}
