"use server";

import * as mammoth from "mammoth";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { parsePracticalWordText } from "@/lib/practical-word";
import { revalidatePath } from "next/cache";

function toMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const details = error as { message?: unknown; code?: unknown; details?: unknown };
    const parts = [
      typeof details.message === "string" ? details.message : null,
      details.code ? `code: ${String(details.code)}` : null,
      details.details ? String(details.details) : null,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(" | ");
  }
  return fallback;
}

function isMissingCaseStudySchema(error: unknown) {
  const message = toMessage(error, "").toLowerCase();
  return (
    message.includes("case_study_id") ||
    message.includes("case_studies") ||
    message.includes("schema cache")
  );
}

const normalizeCaseTitle = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase();

const normalizeQuestionText = (value: string | null | undefined) =>
  (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

interface UploadedWordFile {
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

function isUploadedWordFile(value: unknown): value is UploadedWordFile {
  if (!value || typeof value !== "object") return false;
  const file = value as { name?: unknown; arrayBuffer?: unknown };
  return typeof file.name === "string" && typeof file.arrayBuffer === "function";
}

export async function addQuestion(formData: FormData): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const examId = formData.get("exam_id") as string;
    const questionText = (formData.get("question_text") as string)?.trim();
    const type = (formData.get("type") as string) || "single";
    const marks = Number(formData.get("marks")) || 1;
    const negativeMarks = Number(formData.get("negative_marks")) || 0;
    const explanation = (formData.get("explanation") as string)?.trim() || null;
    const correctText = (formData.get("correct_text") as string)?.trim() || null;
    const caseStudyId = ((formData.get("case_study_id") as string) || "").trim() || null;

    if (!examId || !questionText) {
      return { ok: false, message: "Question text is required." };
    }

    // Options arrive as option_0..option_3 and correct_0..correct_3.
    const options: { option_text: string; is_correct: boolean; position: number }[] =
      [];
    for (let i = 0; i < 4; i++) {
      const text = (formData.get(`option_${i}`) as string)?.trim();
      if (!text) continue;
      options.push({
        option_text: text,
        is_correct: formData.get(`correct_${i}`) === "on",
        position: i,
      });
    }

    const isMcq = type === "single" || type === "multiple" || type === "true_false";

    if (isMcq && options.length < 2) {
      return { ok: false, message: "Add at least 2 options." };
    }
    if (isMcq && !options.some((o) => o.is_correct)) {
      return { ok: false, message: "Select at least 1 correct option." };
    }
    if (!isMcq && type !== "descriptive" && !correctText) {
      return { ok: false, message: "Correct answer is required." };
    }

    // 1) Insert question.
    const { data: q, error } = await supabase
      .from("questions")
      .insert({
        exam_id: examId,
        case_study_id: caseStudyId,
        type,
        question_text: questionText,
        marks,
        negative_marks: negativeMarks,
        explanation,
        correct_text: correctText,
      })
      .select("id")
      .single();

    if (error || !q) {
      return {
        ok: false,
        message: `Question save failed: ${toMessage(error, "Unknown error")}`,
      };
    }

    // 2) Insert options.
    if (options.length > 0) {
      const { error: optionsError } = await supabase
        .from("options")
        .insert(options.map((o) => ({ ...o, question_id: q.id })));

      if (optionsError) {
        await supabase.from("questions").delete().eq("id", q.id);
        return {
          ok: false,
          message: `Options save failed: ${toMessage(optionsError, "Unknown error")}`,
        };
      }
    }

    revalidatePath(`/admin/exams/${examId}/questions`);
    return { ok: true, message: "Question added successfully." };
  } catch (error) {
    return {
      ok: false,
      message: toMessage(error, "Unable to add question."),
    };
  }
}

interface BulkQuestion {
  case_title?: string;
  case_content?: string;
  case_order?: number | null;
  question_text: string;
  options: string[];
  correct: number[];
  marks: number;
  negative_marks: number;
  type: "single" | "multiple";
}

export async function bulkAddQuestions(
  examId: string,
  questions: BulkQuestion[]
): Promise<{ added: number; failed: number; caseStudiesCreated: number }> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  let added = 0;
  let failed = 0;
  let caseStudiesCreated = 0;

  const { data: existingCases } = await supabase
    .from("case_studies")
    .select("id, title")
    .eq("exam_id", examId);

  const caseIdByTitle = new Map<string, string>();
  ((existingCases as { id: string; title: string }[] | null) ?? []).forEach((study) => {
    caseIdByTitle.set(normalizeCaseTitle(study.title), study.id);
  });

  for (const q of questions) {
    if (!q.question_text || q.options.length < 2 || q.correct.length === 0) {
      failed++;
      continue;
    }

    const caseTitle = (q.case_title ?? "").trim();
    let caseStudyId: string | null = null;

    if (caseTitle) {
      const key = normalizeCaseTitle(caseTitle);
      caseStudyId = caseIdByTitle.get(key) ?? null;

      if (!caseStudyId) {
        const caseContent = (q.case_content ?? "").trim();
        if (!caseContent) {
          failed++;
          continue;
        }

        const { data: insertedCase, error: caseError } = await supabase
          .from("case_studies")
          .insert({
            exam_id: examId,
            title: caseTitle,
            content: caseContent,
            position: q.case_order ?? caseIdByTitle.size + 1,
            created_by: profile.id,
          })
          .select("id")
          .single();

        if (caseError || !insertedCase) {
          failed++;
          continue;
        }

        caseStudyId = insertedCase.id as string;
        caseIdByTitle.set(key, caseStudyId);
        caseStudiesCreated++;
      }
    }

    const questionPayload = {
      exam_id: examId,
      case_study_id: caseStudyId,
      type: q.type,
      question_text: q.question_text,
      marks: q.marks,
      negative_marks: q.negative_marks,
    };

    let insertResult = await supabase
      .from("questions")
      .insert(questionPayload)
      .select("id")
      .single();

    if (insertResult.error && !caseStudyId && isMissingCaseStudySchema(insertResult.error)) {
      const { case_study_id, ...fallbackPayload } = questionPayload;
      insertResult = await supabase
        .from("questions")
        .insert(fallbackPayload)
        .select("id")
        .single();
    }

    const inserted = insertResult.data;
    const error = insertResult.error;

    if (error || !inserted) {
      failed++;
      continue;
    }

    const optionRows = q.options.map((text, i) => ({
      question_id: inserted.id,
      option_text: text,
      is_correct: q.correct.includes(i),
      position: i,
    }));

    const { error: optErr } = await supabase.from("options").insert(optionRows);
    if (optErr) failed++;
    else added++;
  }

  revalidatePath(`/admin/exams/${examId}/questions`);
  revalidatePath(`/admin/exams/${examId}/case-studies`);
  return { added, failed, caseStudiesCreated };
}

export async function importPracticalWordFile(formData: FormData): Promise<{
  ok: boolean;
  message: string;
  caseStudiesCreated: number;
  caseStudiesUpdated: number;
  questionsAdded: number;
  questionsSkipped: number;
  questionsFailed: number;
  parsedCases: number;
  parsedQuestions: number;
  warnings: string[];
}> {
  try {
    const profile = await requireAdmin();
    const supabase = await createClient();

    const examId = String(formData.get("exam_id") ?? "");
    const file = formData.get("file");

    if (!examId) {
      return {
        ok: false,
        message: "Exam is required.",
        caseStudiesCreated: 0,
        caseStudiesUpdated: 0,
        questionsAdded: 0,
        questionsSkipped: 0,
        questionsFailed: 0,
        parsedCases: 0,
        parsedQuestions: 0,
        warnings: [],
      };
    }

    if (!isUploadedWordFile(file) || !file.name.toLowerCase().endsWith(".docx")) {
      return {
        ok: false,
        message: "Upload a .docx Word file.",
        caseStudiesCreated: 0,
        caseStudiesUpdated: 0,
        questionsAdded: 0,
        questionsSkipped: 0,
        questionsFailed: 0,
        parsedCases: 0,
        parsedQuestions: 0,
        warnings: [],
      };
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await mammoth.extractRawText({ buffer });
    const parsed = parsePracticalWordText(extracted.value);

    if (parsed.cases.length === 0 || parsed.totalQuestions === 0) {
      return {
        ok: false,
        message:
          "No questions found. Use the Word format with Direction, [Q], (a)-(d), [ans], [Marks], and [sortid].",
        caseStudiesCreated: 0,
        caseStudiesUpdated: 0,
        questionsAdded: 0,
        questionsSkipped: parsed.skippedQuestions,
        questionsFailed: 0,
        parsedCases: parsed.cases.length,
        parsedQuestions: parsed.totalQuestions,
        warnings: parsed.warnings.slice(0, 10),
      };
    }

    const { data: existingCases } = await supabase
      .from("case_studies")
      .select("id, title")
      .eq("exam_id", examId);

    const caseIdByTitle = new Map<string, string>();
    ((existingCases as { id: string; title: string }[] | null) ?? []).forEach((study) => {
      caseIdByTitle.set(normalizeCaseTitle(study.title), study.id);
    });

    const { data: existingQuestions } = await supabase
      .from("questions")
      .select("id, case_study_id, question_text")
      .eq("exam_id", examId);

    const questionKeys = new Set(
      ((existingQuestions as {
        case_study_id: string | null;
        question_text: string;
      }[] | null) ?? []).map(
        (question) =>
          `${question.case_study_id ?? "no-case"}:${normalizeQuestionText(question.question_text)}`
      )
    );

    let caseStudiesCreated = 0;
    let caseStudiesUpdated = 0;
    let questionsAdded = 0;
    let questionsSkipped = parsed.skippedQuestions;
    let questionsFailed = 0;

    for (const study of parsed.cases) {
      let caseStudyId = caseIdByTitle.get(normalizeCaseTitle(study.title)) ?? null;

      if (caseStudyId) {
        const { error } = await supabase
          .from("case_studies")
          .update({
            title: study.title,
            content: study.content,
            position: study.position,
            updated_at: new Date().toISOString(),
          })
          .eq("id", caseStudyId)
          .eq("exam_id", examId);

        if (error) {
          questionsFailed += study.questions.length;
          continue;
        }
        caseStudiesUpdated++;
      } else {
        const { data: insertedCase, error } = await supabase
          .from("case_studies")
          .insert({
            exam_id: examId,
            title: study.title,
            content: study.content,
            position: study.position,
            created_by: profile.id,
          })
          .select("id")
          .single();

        if (error || !insertedCase) {
          questionsFailed += study.questions.length;
          continue;
        }

        caseStudyId = insertedCase.id as string;
        caseIdByTitle.set(normalizeCaseTitle(study.title), caseStudyId);
        caseStudiesCreated++;
      }

      for (const question of study.questions) {
        const duplicateKey = `${caseStudyId}:${normalizeQuestionText(question.question_text)}`;
        if (questionKeys.has(duplicateKey)) {
          questionsSkipped++;
          continue;
        }

        const { data: insertedQuestion, error: questionError } = await supabase
          .from("questions")
          .insert({
            exam_id: examId,
            case_study_id: caseStudyId,
            type: question.type,
            question_text: question.question_text,
            marks: question.marks,
            negative_marks: question.negative_marks,
            explanation: question.explanation,
          })
          .select("id")
          .single();

        if (questionError || !insertedQuestion) {
          questionsFailed++;
          continue;
        }

        const optionRows = question.options.map((text, index) => ({
          question_id: insertedQuestion.id,
          option_text: text,
          is_correct: question.correct.includes(index),
          position: index,
        }));

        const { error: optionsError } = await supabase.from("options").insert(optionRows);
        if (optionsError) {
          await supabase.from("questions").delete().eq("id", insertedQuestion.id);
          questionsFailed++;
          continue;
        }

        questionKeys.add(duplicateKey);
        questionsAdded++;
      }
    }

    revalidatePath(`/admin/exams/${examId}/questions`);
    revalidatePath(`/admin/exams/${examId}/case-studies`);

    return {
      ok: questionsAdded > 0 || caseStudiesCreated > 0 || caseStudiesUpdated > 0,
      message: `${questionsAdded} questions added from Word.`,
      caseStudiesCreated,
      caseStudiesUpdated,
      questionsAdded,
      questionsSkipped,
      questionsFailed,
      parsedCases: parsed.cases.length,
      parsedQuestions: parsed.totalQuestions,
      warnings: parsed.warnings.slice(0, 10),
    };
  } catch (error) {
    return {
      ok: false,
      message: toMessage(error, "Unable to import the Word file."),
      caseStudiesCreated: 0,
      caseStudiesUpdated: 0,
      questionsAdded: 0,
      questionsSkipped: 0,
      questionsFailed: 0,
      parsedCases: 0,
      parsedQuestions: 0,
      warnings: [],
    };
  }
}

export async function updateQuestion(formData: FormData): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const id = formData.get("id") as string;
    const examId = formData.get("exam_id") as string;
    const questionText = (formData.get("question_text") as string)?.trim();
    const type = (formData.get("type") as string) || "single";
    const marks = Number(formData.get("marks")) || 1;
    const negativeMarks = Number(formData.get("negative_marks")) || 0;
    const explanation = (formData.get("explanation") as string)?.trim() || null;
    const correctText = (formData.get("correct_text") as string)?.trim() || null;
    const caseStudyId = ((formData.get("case_study_id") as string) || "").trim() || null;

    if (!id || !examId || !questionText) {
      return { ok: false, message: "Question text is required." };
    }

    const options: { option_text: string; is_correct: boolean; position: number }[] =
      [];
    for (let i = 0; i < 4; i++) {
      const text = (formData.get(`option_${i}`) as string)?.trim();
      if (!text) continue;
      options.push({
        option_text: text,
        is_correct: formData.get(`correct_${i}`) === "on",
        position: i,
      });
    }

    const isMcq = type === "single" || type === "multiple" || type === "true_false";

    if (isMcq && options.length < 2) {
      return { ok: false, message: "Add at least 2 options." };
    }
    if (isMcq && !options.some((o) => o.is_correct)) {
      return { ok: false, message: "Select at least 1 correct option." };
    }
    if (!isMcq && type !== "descriptive" && !correctText) {
      return { ok: false, message: "Correct answer is required." };
    }

    // 1) Update question.
    const { error } = await supabase
      .from("questions")
      .update({
        case_study_id: caseStudyId,
        type,
        question_text: questionText,
        marks,
        negative_marks: negativeMarks,
        explanation,
        correct_text: correctText,
      })
      .eq("id", id);

    if (error) {
      return {
        ok: false,
        message: `Question update failed: ${toMessage(error, "Unknown error")}`,
      };
    }

    // 2) Replace options.
    await supabase.from("options").delete().eq("question_id", id);
    if (options.length > 0) {
      const { error: optionsError } = await supabase
        .from("options")
        .insert(options.map((o) => ({ ...o, question_id: id })));

      if (optionsError) {
        return {
          ok: false,
          message: `Options save failed: ${toMessage(optionsError, "Unknown error")}`,
        };
      }
    }

    revalidatePath(`/admin/exams/${examId}/questions`);
    return { ok: true, message: "Question updated successfully." };
  } catch (error) {
    return {
      ok: false,
      message: toMessage(error, "Unable to update question."),
    };
  }
}

export async function deleteQuestion(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const examId = formData.get("exam_id") as string;
  const supabase = await createClient();
  await supabase.from("questions").delete().eq("id", id);
  revalidatePath(`/admin/exams/${examId}/questions`);
}
