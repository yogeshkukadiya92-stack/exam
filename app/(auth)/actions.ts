"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhoneNumber, phoneLookupValues } from "@/lib/phone";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function login(formData: FormData) {
  const identifier = ((formData.get("identifier") || formData.get("email")) as string)?.trim();
  const password = formData.get("password") as string;
  const next = formData.get("next") as string | null;

  const supabase = await createClient();
  let error: Error | null = null;

  if (identifier?.includes("@")) {
    const result = await supabase.auth.signInWithPassword({
      email: identifier.toLowerCase(),
      password,
    });
    error = result.error;
  } else {
    const phone = normalizePhoneNumber(identifier);
    if (!phone) {
      redirect("/login?error=" + encodeURIComponent("Valid email athva mobile number aapo."));
    }

    const phoneResult = await supabase.auth.signInWithPassword({ phone, password });
    error = phoneResult.error;

    if (error) {
      const email = await findEmailByPhone(identifier);
      if (email) {
        const emailResult = await supabase.auth.signInWithPassword({ email, password });
        error = emailResult.error;
      }
    }
  }

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/", "layout");
  redirect(getSafeRedirect(next));
}

function getSafeRedirect(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

async function findEmailByPhone(phoneInput: string) {
  try {
    const values = phoneLookupValues(phoneInput);
    if (values.length === 0) return null;

    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("email")
      .eq("role", "student")
      .in("phone", values)
      .limit(1)
      .maybeSingle();

    return data?.email || null;
  } catch {
    return null;
  }
}

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("full_name") as string;
  const phoneRaw = (formData.get("phone") as string)?.trim();
  const phone = phoneRaw ? normalizePhoneNumber(phoneRaw) : null;

  if (phoneRaw && !phone) {
    redirect("/signup?error=" + encodeURIComponent("Valid mobile number aapo."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone, role: "student" },
    },
  });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  if (phone && data.user) {
    await syncSignupPhone(data.user.id, email, fullName, phone);
  }

  redirect("/login?message=" + encodeURIComponent("Account banyu! Have login karo."));
}

async function syncSignupPhone(userId: string, email: string, fullName: string, phone: string) {
  try {
    const admin = createAdminClient();
    await admin.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName || null,
        email,
        phone,
        role: "student",
      },
      { onConflict: "id" }
    );
    await admin.auth.admin.updateUserById(userId, {
      phone,
      phone_confirm: true,
      user_metadata: { full_name: fullName, phone, role: "student" },
    });
  } catch {
    // If service role is not configured, metadata still carries the phone.
  }
}

export async function forgotPassword(formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3005";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    redirect("/forgot-password?error=" + encodeURIComponent(error.message));
  }
  redirect(
    "/forgot-password?message=" +
      encodeURIComponent("Check your email for a password reset link.")
  );
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
