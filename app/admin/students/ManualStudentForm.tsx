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
        phone: phone.trim() || null,
        password,
        batchId: batchId || null,
      });

      setOk(res.ok);
      setMessage(formatMessage(res.message, "Student create karva ma problem aavi."));

      if (res.ok) {
        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setBatchId("");
      }
    } catch (error) {
      setOk(false);
      setMessage(formatMessage(error, "Student create karva ma problem aavi."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mb-5 space-y-4 rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Add student manually</h2>
          <p className="text-sm text-gray-500">New student account create karo and optional batch enroll karo.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          placeholder="Mobile number (e.g. +91 9876543210)"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          minLength={6}
          placeholder="Password"
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-gray-400"
        >
          <option value="">No batch enroll</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      {message && (
        <p className={`rounded-md p-2 text-sm ${ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40"
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
