"use client";

import { useState } from "react";
import { createStudent } from "./actions";

interface BatchOption {
  id: string;
  label: string;
}

export default function ManualStudentForm({
  batches,
}: {
  batches: BatchOption[];
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [batchId, setBatchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setOk(false);

    try {
      const res = await createStudent({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        batchId: batchId || null,
      });

      setOk(res.ok);
      setMessage(formatMessage(res.message, "Unable to create student."));

      if (res.ok) {
        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setBatchId("");
      }
    } catch (error) {
      setOk(false);
      setMessage(formatMessage(error, "Unable to create student."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} autoComplete="off" className="card mb-5 space-y-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Add student manually</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create a student account, enable mobile login, and optionally enroll the student in a batch.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Full name
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Nilesh Patel"
            className="input mt-1.5"
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="off"
            name="student-email"
            placeholder="student@example.com"
            className="input mt-1.5"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Mobile number
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            required
            placeholder="+91 9876543210"
            className="input mt-1.5"
          />
        </label>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            name="student-password"
            placeholder="Minimum 6 characters"
            className="input mt-1.5"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Batch enrollment
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="input mt-1.5"
          >
            <option value="">Do not enroll in a batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && (
        <p className={`rounded-xl border p-3 text-sm ${
          ok
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full sm:w-auto"
      >
        {busy ? "Adding..." : "Add student"}
      </button>
    </form>
  );
}

function formatMessage(value: unknown, fallback: string) {
  if (value instanceof Error) {
    const message = normalizeMessage(value.message);
    if (message) return message;
  }

  if (typeof value === "string") {
    const message = normalizeMessage(value);
    if (message) return message;
  }

  try {
    const serialized = JSON.stringify(value);
    const message = normalizeMessage(serialized);
    if (message) return message;
  } catch {
    // Ignore serialization errors and use the friendly fallback.
  }

  return fallback;
}

function normalizeMessage(value: unknown) {
  if (typeof value !== "string") return null;
  const message = value.trim();
  if (!message || message === "{}" || message === "[]") return null;
  return message;
}
