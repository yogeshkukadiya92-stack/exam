"use client";

import { useState } from "react";
import { Search, Users } from "lucide-react";

interface Student {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export default function StudentSearch({ students }: { students: Student[] }) {
  const [term, setTerm] = useState("");

  const filtered = students.filter((s) => {
    if (!term) return true;
    const q = term.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="input pl-9"
        />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/50 text-left">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Name
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Email
              </th>
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Phone
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((s) => (
              <tr
                key={s.id}
                className="transition-colors hover:bg-slate-50/50"
              >
                <td className="px-5 py-3.5 font-medium text-slate-900">
                  {s.full_name || "—"}
                </td>
                <td className="px-5 py-3.5 text-slate-500">{s.email}</td>
                <td className="px-5 py-3.5 text-slate-500">{s.phone || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center">
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
