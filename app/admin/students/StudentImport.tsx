"use client";

import { useRef, useState } from "react";
import {
  downloadStudentTemplate,
  parseStudentsFile,
  type ParsedStudent,
} from "@/lib/excel";
import { bulkImportStudents } from "./actions";

interface BatchOption {
  id: string;
  label: string;
}

export default function StudentImport({ batches }: { batches: BatchOption[] }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedStudent[] | null>(null);
  const [batchId, setBatchId] = useState("");
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
      setRows(await parseStudentsFile(file));
    } catch {
      setResult("Could not read the file. Upload an .xlsx or .csv file.");
    }
  };

  const submit = async () => {
    if (valid.length === 0) return;
    setBusy(true);
    const res = await bulkImportStudents(
      batchId || null,
      valid.map((r) => ({
        full_name: r.full_name,
        email: r.email,
        phone: r.phone,
        password: r.password,
      }))
    );
    setBusy(false);
    setResult(
      `${res.created} students created - ${res.enrolled} enrolled in batch` +
        (res.failed ? ` - ${res.failed} failed` : "")
    );
    setRows(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-primary"
      >
        Bulk import (Excel)
      </button>
    );
  }

  const input = "input";

  return (
    <div className="card mb-5 space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">Bulk import students</h2>
        <button
          onClick={() => {
            setOpen(false);
            setRows(null);
            setResult(null);
          }}
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={downloadStudentTemplate}
          className="btn-secondary px-3 py-1.5 text-sm"
        >
          Download template
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={onFile}
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-100 dark:text-slate-300 dark:file:border-slate-600 dark:file:bg-slate-800 dark:file:text-slate-200"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Enroll in batch (optional)
        </label>
        <select
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          className={input}
        >
          <option value="">No batch</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-slate-400">Columns: Name - Email - Mobile - Password</p>

      {result && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
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
          <div className="max-h-72 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Mobile</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className="border-t border-slate-100 dark:border-slate-700">
                    <td className="px-3 py-2">{r.full_name || "-"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.email || "-"}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.phone || "-"}</td>
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
            className="btn-primary mt-3"
          >
            {busy ? "Importing..." : `Import ${valid.length} students`}
          </button>
        </div>
      )}
    </div>
  );
}
