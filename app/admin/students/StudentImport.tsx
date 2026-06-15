"use client";

import { useState, useRef } from "react";
import {
  downloadStudentTemplate,
  parseStudentsFile,
  type ParsedStudent,
} from "@/lib/excel";
import { bulkImportStudents } from "./actions";

interface BatchOption {
  id: string;
  label: string; // "Course — Batch"
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
      setResult("File read na thai. .xlsx athva .csv aapo.");
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
        password: r.password,
      }))
    );
    setBusy(false);
    setResult(
      `${res.created} student banya · ${res.enrolled} batch ma enroll` +
        (res.failed ? ` · ${res.failed} fail` : "")
    );
    setRows(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        📥 Bulk import (Excel)
      </button>
    );
  }

  const input =
    "w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400";

  return (
    <div className="mb-5 space-y-3 rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Students bulk import</h2>
        <button
          onClick={() => { setOpen(false); setRows(null); setResult(null); }}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Close
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={downloadStudentTemplate}
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

      <div>
        <label className="mb-1 block text-sm font-medium">
          Batch ma enroll karo (optional)
        </label>
        <select
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          className={input}
        >
          <option value="">— Koi batch nahi —</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-gray-400">Columns: Name · Email · Password</p>

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
              <span className="text-red-600"> · {invalid.length} ma error</span>
            )}
          </p>
          <div className="max-h-72 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className="border-t">
                    <td className="px-3 py-2">{r.full_name || "—"}</td>
                    <td className="px-3 py-2 text-gray-600">{r.email || "—"}</td>
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
            {busy ? "Importing…" : `Import ${valid.length} students`}
          </button>
        </div>
      )}
    </div>
  );
}
