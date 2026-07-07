"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

interface BulkCaseStudy {
  title: string;
  content: string;
  position: number | null;
}

function normalizeTitle(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export async function addCaseStudy(formData: FormData) {
  try {
    const profile = await requireAdmin();
    const supabase = await createClient();

    const examId = formData.get("exam_id") as string;
    const title = (formData.get("title") as string)?.trim();
    const content = (formData.get("content") as string)?.trim();

    if (!examId || !title || !content) {
      return;
    }

    const { error } = await supabase.from("case_studies").insert({
      exam_id: examId,
      title,
      content,
      position: Number(formData.get("position")) || 0,
      created_by: profile.id,
    });

    if (error) {
      console.error("Case study save failed:", toMessage(error, "Unknown error"));
      return;
    }

    revalidatePath(`/admin/exams/${examId}/case-studies`);
    revalidatePath(`/admin/exams/${examId}/questions`);
  } catch (error) {
    console.error("Unable to add case study:", toMessage(error, "Unknown error"));
  }
}

export async function bulkImportCaseStudies(
  examId: string,
  studies: BulkCaseStudy[]
): Promise<{ added: number; updated: number; failed: number }> {
  const profile = await requireAdmin();
  const supabase = await createClient();

  let added = 0;
  let updated = 0;
  let failed = 0;

  const { data: existingCases } = await supabase
    .from("case_studies")
    .select("id, title")
    .eq("exam_id", examId);

  const caseIdByTitle = new Map<string, string>();
  ((existingCases as { id: string; title: string }[] | null) ?? []).forEach((study) => {
    caseIdByTitle.set(normalizeTitle(study.title), study.id);
  });

  for (const study of studies) {
    const title = study.title.trim();
    const content = study.content.trim();

    if (!examId || !title || !content) {
      failed++;
      continue;
    }

    const position = study.position ?? caseIdByTitle.size + 1;
    const existingId = caseIdByTitle.get(normalizeTitle(title));

    if (existingId) {
      const { error } = await supabase
        .from("case_studies")
        .update({
          title,
          content,
          position,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingId)
        .eq("exam_id", examId);

      if (error) failed++;
      else updated++;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("case_studies")
      .insert({
        exam_id: examId,
        title,
        content,
        position,
        created_by: profile.id,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      failed++;
      continue;
    }

    caseIdByTitle.set(normalizeTitle(title), inserted.id as string);
    added++;
  }

  revalidatePath(`/admin/exams/${examId}/case-studies`);
  revalidatePath(`/admin/exams/${examId}/questions`);
  return { added, updated, failed };
}

export async function updateCaseStudy(formData: FormData) {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const id = formData.get("id") as string;
    const examId = formData.get("exam_id") as string;
    const title = (formData.get("title") as string)?.trim();
    const content = (formData.get("content") as string)?.trim();

    if (!id || !examId || !title || !content) {
      return;
    }

    const { error } = await supabase
      .from("case_studies")
      .update({
        title,
        content,
        position: Number(formData.get("position")) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("exam_id", examId);

    if (error) {
      console.error("Case study update failed:", toMessage(error, "Unknown error"));
      return;
    }

    revalidatePath(`/admin/exams/${examId}/case-studies`);
    revalidatePath(`/admin/exams/${examId}/questions`);
  } catch (error) {
    console.error("Unable to update case study:", toMessage(error, "Unknown error"));
  }
}

export async function deleteCaseStudy(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const examId = formData.get("exam_id") as string;
  if (!id || !examId) return;

  await supabase.from("case_studies").delete().eq("id", id).eq("exam_id", examId);
  revalidatePath(`/admin/exams/${examId}/case-studies`);
  revalidatePath(`/admin/exams/${examId}/questions`);
}
