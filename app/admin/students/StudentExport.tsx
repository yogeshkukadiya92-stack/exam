"use client";

import * as XLSX from "xlsx";
import { Download } from "lucide-react";

interface Student {
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export default function StudentExport({ students }: { students: Student[] }) {
  const exportXlsx = () => {
    const rows = students.map((s, i) => ({
      "#": i + 1,
      Name: s.full_name || "—",
      Email: s.email || "—",
      "Joined": new Date(s.created_at).toLocaleDateString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 30 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "students_export.xlsx");
  };

  return (
    <button
      onClick={exportXlsx}
      disabled={students.length === 0}
      className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-40"
    >
      <Download className="h-3.5 w-3.5" />
      Export
    </button>
  );
}
