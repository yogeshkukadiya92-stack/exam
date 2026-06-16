"use client";

import * as XLSX from "xlsx";
import { Download } from "lucide-react";

interface Question {
  subject: string;
  topic: string | null;
  difficulty: string | null;
  type: string;
  question_text: string;
  marks: number;
  negative_marks: number;
}

export default function QuestionBankExport({ questions }: { questions: Question[] }) {
  const exportXlsx = () => {
    const rows = questions.map((q, i) => ({
      "#": i + 1,
      Subject: q.subject,
      Topic: q.topic || "",
      Difficulty: q.difficulty || "",
      Type: q.type,
      Question: q.question_text,
      Marks: q.marks,
      "Neg. Marks": q.negative_marks,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 10 }, { wch: 50 }, { wch: 7 }, { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, "question_bank_export.xlsx");
  };

  return (
    <button
      onClick={exportXlsx}
      disabled={questions.length === 0}
      className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-40"
    >
      <Download className="h-3.5 w-3.5" />
      Export
    </button>
  );
}
