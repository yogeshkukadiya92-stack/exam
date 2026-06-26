import * as XLSX from "xlsx";
import { normalizePhoneNumber } from "./phone";

/* ----------------------- Question Excel ----------------------- */

export interface ParsedQuestion {
  row: number;
  question_text: string;
  options: string[]; // up to 4
  correct: number[]; // indices
  marks: number;
  negative_marks: number;
  type: "single" | "multiple";
  error?: string;
}

const QUESTION_HEADERS = [
  "Question", "OptionA", "OptionB", "OptionC", "OptionD",
  "CorrectAnswer", "Marks", "NegativeMarks",
];

const LETTER_TO_INDEX: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

/** Download a blank question template (.xlsx) with one example row. */
export function downloadQuestionTemplate() {
  const example = [
    "What is 2 + 2?", "3", "4", "5", "6", "B", 2, 0.5,
  ];
  const ws = XLSX.utils.aoa_to_sheet([QUESTION_HEADERS, example]);
  ws["!cols"] = QUESTION_HEADERS.map((h) => ({ wch: Math.max(h.length, 12) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");
  XLSX.writeFile(wb, "questions_template.xlsx");
}

/** Parse an uploaded question Excel/CSV into validated rows. */
export async function parseQuestionsFile(file: File): Promise<ParsedQuestion[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  return rows.map((r, i) => {
    const get = (k: string) => String(r[k] ?? "").trim();
    const question_text = get("Question");
    const opts = [get("OptionA"), get("OptionB"), get("OptionC"), get("OptionD")];
    const options = opts.filter(Boolean);

    // CorrectAnswer: "B", "A,C", or "AC".
    const correctRaw = get("CorrectAnswer").toUpperCase().replace(/[^A-D]/g, "");
    const correct = [...correctRaw]
      .map((ch) => LETTER_TO_INDEX[ch])
      .filter((idx) => idx !== undefined && opts[idx]);

    const marks = Number(r["Marks"]) || 1;
    const negative_marks = Math.abs(Number(r["NegativeMarks"]) || 0);
    const type = correct.length > 1 ? "multiple" : "single";

    let error: string | undefined;
    if (!question_text) error = "Question is required";
    else if (options.length < 2) error = "Add at least 2 options";
    else if (correct.length === 0) error = "CorrectAnswer must be A/B/C/D";

    return { row: i + 2, question_text, options, correct, marks, negative_marks, type, error };
  });
}

/* ----------------------- Student Excel ----------------------- */

export interface ParsedStudent {
  row: number;
  full_name: string;
  email: string;
  phone: string;
  password: string;
  error?: string;
}

const STUDENT_HEADERS = ["Name", "Email", "Mobile", "Password"];

export function downloadStudentTemplate() {
  const example = ["Rahul Patel", "rahul@example.com", "+91 9876543210", "pass1234"];
  const ws = XLSX.utils.aoa_to_sheet([STUDENT_HEADERS, example]);
  ws["!cols"] = STUDENT_HEADERS.map((h) => ({ wch: Math.max(h.length, 16) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, "students_template.xlsx");
}

export async function parseStudentsFile(file: File): Promise<ParsedStudent[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  return rows.map((r, i) => {
    const full_name = String(r["Name"] ?? "").trim();
    const email = String(r["Email"] ?? "").trim().toLowerCase();
    const phone = String(r["Mobile"] ?? r["Phone"] ?? "").trim();
    const password = String(r["Password"] ?? "").trim();

    let error: string | undefined;
    if (!email || !email.includes("@")) error = "Enter a valid email";
    else if (!normalizePhoneNumber(phone)) error = "Enter a valid mobile number";
    else if (password.length < 6) error = "Password must be at least 6 characters";

    return { row: i + 2, full_name, email, phone, password, error };
  });
}
