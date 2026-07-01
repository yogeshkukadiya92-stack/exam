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
