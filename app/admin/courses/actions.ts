"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createCourse(formData: FormData) {
  const profile = await requireAdmin();
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  if (!name) return;

  const supabase = await createClient();
  await supabase
    .from("courses")
    .insert({ name, description, created_by: profile.id });

  revalidatePath("/admin/courses");
}

export async function deleteCourse(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;

  const supabase = await createClient();
  await supabase.from("courses").delete().eq("id", id);

  revalidatePath("/admin/courses");
}

export async function createBatch(formData: FormData) {
  await requireAdmin();
  const courseId = formData.get("course_id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!name || !courseId) return;

  const supabase = await createClient();
  await supabase.from("batches").insert({ course_id: courseId, name });

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function updateCourse(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("courses").update({ name, description }).eq("id", id);

  revalidatePath("/admin/courses");
}

export async function updateBatch(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const courseId = formData.get("course_id") as string;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("batches").update({ name }).eq("id", id);

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function deleteBatch(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const courseId = formData.get("course_id") as string;

  const supabase = await createClient();
  await supabase.from("batches").delete().eq("id", id);

  revalidatePath(`/admin/courses/${courseId}`);
}
