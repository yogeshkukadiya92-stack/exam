"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, X } from "lucide-react";
import {
  downloadCaseStudyTemplate,
  parseCaseStudiesFile,
  type ParsedCaseStudy,
} from "@/lib/excel";
import { bulkImportCaseStudies } from "./actions";

export default function CaseStudyExcelUpload({ examId }: { examId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedCaseStudy[] | null>(null);
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
      setRows(await parseCaseStudiesFile(file));
    } catch {
      setResult("Could not read the file. Upload an .xlsx or .csv file.");
    }
  };

  const submit = async () => {
    if (valid.length === 0) return;
    setBusy(true);
    const res = await bulkImportCaseStudies(
      examId,
      valid.map((r) => ({
        title: r.title,
        content: r.content,
        position: r.position,
      }))
    );
    setBusy(false);
    setResult(
      `${res.added} case studies added${
        res.updated ? `, ${res.updated} updated` : ""
      }${res.failed ? `, ${res.failed} failed` : ""}.`
    );
    setRows(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary mb-4 inline-flex items-center gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Add case studies from Excel
      </button>
    );
  }

  return (
    <div className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
          <h2 className="font-medium text-slate-900">Upload case studies from Excel</h2>
        </div>
        <button
          onClick={() => {
            setOpen(false);
            setRows(null);
            setResult(null);
          }}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close case study Excel upload"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={downloadCaseStudyTemplate}
          className="btn-secondary inline-flex items-center gap-2 px-3 py-1.5"
        >
          <Download className="h-4 w-4" />
          Download template
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFile}
          className="text-sm file:mr-3 file:rounded-md file:border file:bg-slate-50 file:px-3 file:py-1.5 file:text-sm"
        />
      </div>

      <p className="text-xs text-slate-400">
        Columns: Title - Content - Order. Existing case studies with the same title are updated.
      </p>

      {result && (
        <p className="rounded-md bg-emerald-50 p-2 text-sm text-emerald-700">
          {result}
        </p>
      )}

      {rows && (
        <div>
          <p className="mb-2 text-sm">
            <span className="text-emerald-700">{valid.length} valid</span>
            {invalid.length > 0 && (
              <span className="text-red-600"> - {invalid.length} errors</span>
            )}
          </p>

          <div className="max-h-72 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">Content</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className="border-t">
                    <td className="px-3 py-2 text-slate-400">{r.row}</td>
                    <td className="px-3 py-2">{r.title || "-"}</td>
                    <td className="px-3 py-2">{r.position ?? "-"}</td>
                    <td className="max-w-md px-3 py-2 text-slate-600">
                      <span className="line-clamp-2 whitespace-pre-line">
                        {r.content || "-"}
                      </span>
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
            className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            {busy ? "Importing..." : `Import ${valid.length} case studies`}
          </button>
        </div>
      )}
    </div>
  );
}
