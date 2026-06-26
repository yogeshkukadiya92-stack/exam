"use server";

import { createClient } from "@/lib/supabase/server";
import { requireStudent } from "@/lib/auth";
import { normalizePhoneNumber } from "@/lib/phone";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateProfile(formData: FormData) {
  const profile = await requireStudent();
  const supabase = await createClient();

  const full_name = (formData.get("full_name") as string)?.trim() || null;
  const phoneRaw = (formData.get("phone") as string)?.trim();
  const phone = phoneRaw ? normalizePhoneNumber(phoneRaw) : null;

  if (phoneRaw && !phone) {
    redirect("/student/profile?error=Valid mobile number aapo");
  }

  await supabase
    .from("profiles")
    .update({ full_name, phone })
    .eq("id", profile.id);

  revalidatePath("/student", "layout");
  redirect("/student/profile?message=Profile updated successfully");
}

export async function changePassword(formData: FormData) {
  await requireStudent();
  const supabase = await createClient();

  const password = (formData.get("password") as string);
  const confirm = (formData.get("confirm_password") as string);

  if (!password || password.length < 6) {
    redirect("/student/profile?error=Password must be at least 6 characters");
  }

  if (password !== confirm) {
    redirect("/student/profile?error=Passwords do not match");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/student/profile?error=" + encodeURIComponent(error.message));
  }

  redirect("/student/profile?message=Password changed successfully");
}
