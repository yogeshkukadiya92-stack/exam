"use client";

import * as XLSX from "xlsx";

interface Attempt {
  student_name: string;
  email: string;
  score: number | null;
  submitted_at: string | null;
}

export default function ResultsExport({
  examTitle,
  attempts,
  passMarks,
}: {
  examTitle: string;
  attempts: Attempt[];
  passMarks: number;
}) {
  const exportXlsx = () => {
    const rows = attempts.map((a, i) => ({
      Rank: i + 1,
      Name: a.student_name,
      Email: a.email,
      Score: a.score ?? 0,
      Result: (a.score ?? 0) >= passMarks ? "Pass" : "Fail",
      Submitted: a.submitted_at
        ? new Date(a.submitted_at).toLocaleString()
        : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 }, { wch: 22 }, { wch: 26 }, { wch: 8 }, { wch: 8 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");
    const safe = examTitle.replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
    XLSX.writeFile(wb, `${safe}_results.xlsx`);
  };

  return (
    <button
      onClick={exportXlsx}
      disabled={attempts.length === 0}
      className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-40"
    >
      ⬇ Export Excel
    </button>
  );
}
