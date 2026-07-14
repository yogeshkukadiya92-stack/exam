"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import {
  assignStudentToBatch,
  deleteStudent,
  removeStudentFromBatch,
  updateStudent,
} from "./actions";

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface BatchOption {
  id: string;
  label: string;
}

interface Enrollment {
  batchId: string;
  label: string;
}

interface EditValues {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}

const editInput =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export default function StudentSearch({
  students,
  batches,
  enrollmentsByStudent,
}: {
  students: Student[];
  batches: BatchOption[];
  enrollmentsByStudent: Record<string, Enrollment[]>;
}) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [editingFor, setEditingFor] = useState<string | null>(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [editValues, setEditValues] = useState<EditValues>({
    full_name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  const filtered = students.filter((s) => {
    if (!term) return true;
    const q = term.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    );
  });

  const setEditValue = (key: keyof EditValues, value: string) => {
    setEditValues((current) => ({ ...current, [key]: value }));
  };

  const startEdit = (student: Student) => {
    setEditingFor(student.id);
    setOpenFor(null);
    setConfirmDeleteFor(null);
    setMessage(null);
    setEditValues({
      full_name: student.full_name ?? "",
      email: student.email ?? "",
      phone: student.phone ?? "",
      password: "",
    });
  };

  const assign = async (studentId: string) => {
    if (!selectedBatch) return;
    setBusy(true);
    setMessage(null);
    const res = await assignStudentToBatch(studentId, selectedBatch);
    setBusy(false);
    setMessage({ id: studentId, ok: res.ok, text: res.message });
    if (res.ok) {
      setOpenFor(null);
      setSelectedBatch("");
      router.refresh();
    }
  };

  const remove = async (studentId: string, batchId: string) => {
    setBusy(true);
    setMessage(null);
    const res = await removeStudentFromBatch(studentId, batchId);
    setBusy(false);
    setMessage({ id: studentId, ok: res.ok, text: res.message });
    if (res.ok) router.refresh();
  };

  const saveEdit = async (studentId: string) => {
    setBusy(true);
    setMessage(null);
    const res = await updateStudent({ id: studentId, ...editValues });
    setBusy(false);
    setMessage({ id: studentId, ok: res.ok, text: res.message });
    if (res.ok) {
      setEditingFor(null);
      router.refresh();
    }
  };

  const removeStudent = async (studentId: string) => {
    setBusy(true);
    setMessage(null);
    const res = await deleteStudent(studentId);
    setBusy(false);
    setMessage({ id: studentId, ok: res.ok, text: res.message });
    if (res.ok) {
      setConfirmDeleteFor(null);
      router.refresh();
    }
  };

  return (
    <div>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email or mobile..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="input pl-9"
        />
      </div>

      <div className="table-shell">
        <table className="admin-table min-w-[760px]">
          <thead className="border-b border-slate-100 bg-slate-50/50 text-left dark:border-slate-700 dark:bg-slate-800/70">
            <tr>
              <th>
                Name
              </th>
              <th className="hidden sm:table-cell">
                Email / Mobile
              </th>
              <th>
                Batches / Courses
              </th>
              <th className="text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {filtered.map((s) => {
              const enrolled = enrollmentsByStudent[s.id] ?? [];
              const enrolledIds = new Set(enrolled.map((e) => e.batchId));
              const available = batches.filter((b) => !enrolledIds.has(b.id));
              const isEditing = editingFor === s.id;

              return (
                <tr key={s.id} className="align-top transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                  <td className="font-medium text-slate-900 dark:text-slate-100">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          value={editValues.full_name}
                          onChange={(e) => setEditValue("full_name", e.target.value)}
                          placeholder="Full name"
                          className={editInput}
                        />
                        <input
                          value={editValues.password}
                          onChange={(e) => setEditValue("password", e.target.value)}
                          type="password"
                          minLength={6}
                          placeholder="New password (optional)"
                          className={editInput}
                        />
                      </div>
                    ) : (
                      <>
                        {s.full_name || "-"}
                        <div className="text-xs font-normal text-slate-400 sm:hidden">
                          {s.email || "-"}
                        </div>
                        <div className="text-xs font-normal text-slate-400 sm:hidden">
                          {s.phone || "-"}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="hidden text-slate-500 dark:text-slate-300 sm:table-cell">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          value={editValues.email}
                          onChange={(e) => setEditValue("email", e.target.value)}
                          type="email"
                          required
                          placeholder="Email"
                          className={editInput}
                        />
                        <input
                          value={editValues.phone}
                          onChange={(e) => setEditValue("phone", e.target.value)}
                          type="tel"
                          required
                          placeholder="Mobile number"
                          className={editInput}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div>{s.email || "-"}</div>
                        <div className="text-xs text-slate-400">{s.phone || "-"}</div>
                      </div>
                    )}
                  </td>
                  <td>
                    {enrolled.length === 0 ? (
                      <span className="text-xs text-slate-400">No batch</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {enrolled.map((e) => (
                          <span
                            key={e.batchId}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                          >
                            {e.label}
                            <button
                              type="button"
                              onClick={() => remove(s.id, e.batchId)}
                              disabled={busy || isEditing}
                              className="text-indigo-400 hover:text-red-500 disabled:opacity-40"
                              title="Remove from batch"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {message?.id === s.id && (
                      <p
                        className={`mt-1.5 text-xs ${
                          message.ok ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {message.text}
                      </p>
                    )}
                  </td>
                  <td className="text-right">
                    {isEditing ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(s.id)}
                          disabled={busy}
                          className="btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-40"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {busy ? "Saving" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingFor(null)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                          title="Cancel edit"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : openFor === s.id ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <select
                          value={selectedBatch}
                          onChange={(e) => setSelectedBatch(e.target.value)}
                          className="input max-w-[200px] py-1.5 text-xs"
                        >
                          <option value="">Select batch / course</option>
                          {available.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => assign(s.id)}
                          disabled={busy || !selectedBatch}
                          className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                        >
                          {busy ? "..." : "Assign"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenFor(null);
                            setSelectedBatch("");
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                          title="Cancel assign"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : confirmDeleteFor === s.id ? (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => removeStudent(s.id)}
                          disabled={busy}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
                        >
                          {busy ? "Deleting" : "Confirm delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteFor(null)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                          title="Cancel delete"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenFor(s.id);
                            setSelectedBatch("");
                            setMessage(null);
                            setConfirmDeleteFor(null);
                          }}
                          disabled={available.length === 0}
                          className="btn-secondary inline-flex items-center gap-1.5 text-xs disabled:opacity-40"
                          title={available.length === 0 ? "All batches assigned" : "Assign batch / course"}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Assign
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className="rounded-lg border p-1.5 text-slate-500 hover:bg-slate-100"
                          title="Edit student"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteFor(s.id);
                            setOpenFor(null);
                            setMessage(null);
                          }}
                          className="rounded-lg border p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          title="Delete student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center">
                  <Users className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">
                    {term
                      ? "No students match your search."
                      : "No students yet. Use bulk import or let students sign up."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
