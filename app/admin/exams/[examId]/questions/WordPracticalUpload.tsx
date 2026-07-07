"use client";

import { useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";
import { importPracticalWordFile } from "./actions";

type ImportResult = Awaited<ReturnType<typeof importPracticalWordFile>>;

export default function WordPracticalUpload({ examId }: { examId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setResult({
        ok: false,
        message: "Select a Word .docx file.",
        caseStudiesCreated: 0,
        caseStudiesUpdated: 0,
        questionsAdded: 0,
        questionsSkipped: 0,
        questionsFailed: 0,
        parsedCases: 0,
        parsedQuestions: 0,
        warnings: [],
      });
      return;
    }

    const formData = new FormData();
    formData.set("exam_id", examId);
    formData.set("file", file);

    setBusy(true);
    setResult(null);
    const response = await importPracticalWordFile(formData);
    setBusy(false);
    setResult(response);

    if (response.ok) {
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary mb-4 inline-flex items-center gap-2"
      >
        <FileText className="h-4 w-4" />
        Upload practical Word file
      </button>
    );
  }

  return (
    <div className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-indigo-500" />
          <h2 className="font-medium text-slate-900">Upload practical Word file</h2>
        </div>
        <button
          onClick={() => {
            setOpen(false);
            setResult(null);
            setFileName("");
            if (fileRef.current) fileRef.current.value = "";
          }}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close Word upload"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".docx"
          onChange={(event) => {
            setResult(null);
            setFileName(event.target.files?.[0]?.name ?? "");
          }}
          className="text-sm file:mr-3 file:rounded-md file:border file:bg-slate-50 file:px-3 file:py-1.5 file:text-sm"
        />
        <button
          disabled={busy || !fileName}
          onClick={submit}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
        >
          <span className="inline-flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            {busy ? "Importing..." : "Import Word"}
          </span>
        </button>
      </div>

      <p className="text-xs text-slate-400">
        Format: Direction + LIFESTYLE case block, then [Q], (a)-(d), [ans], [Marks], [sortid], [soln].
      </p>

      {result && (
        <div
          className={`rounded-md p-3 text-sm ${
            result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          <p className="font-medium">{result.message}</p>
          <p className="mt-1">
            {result.caseStudiesCreated} case studies added
            {result.caseStudiesUpdated ? `, ${result.caseStudiesUpdated} updated` : ""}
            {result.questionsSkipped ? `, ${result.questionsSkipped} skipped` : ""}
            {result.questionsFailed ? `, ${result.questionsFailed} failed` : ""}.
          </p>
          <p className="mt-1 text-xs opacity-80">
            Parsed {result.parsedCases} case blocks and {result.parsedQuestions} questions.
          </p>
          {result.warnings.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs opacity-80">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
