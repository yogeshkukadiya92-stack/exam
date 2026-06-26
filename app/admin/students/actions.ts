"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { normalizePhoneNumber, phoneLookupValues } from "@/lib/phone";
import { revalidatePath } from "next/cache";

interface BulkStudent {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}

interface CreateStudentInput {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  batchId?: string | null;
}

interface UpdateStudentInput {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  password?: string | null;
}

function toMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = normalizeMessage(error.message);
    if (message) return message;
  }

  if (typeof error === "string") {
    const message = normalizeMessage(error);
    if (message) return message;
  }

  if (error && typeof error === "object") {
    const details = error as {
      message?: unknown;
      code?: unknown;
      status?: unknown;
      name?: unknown;
    };
    const parts = [
      normalizeMessage(details.message),
      details.code ? `code: ${String(details.code)}` : null,
      details.status ? `status: ${String(details.status)}` : null,
      details.name ? `type: ${String(details.name)}` : null,
    ].filter(Boolean);

    if (parts.length > 0) return parts.join(" | ");
  }

  return fallback;
}

function createUserMessage(error: unknown) {
  const message = toMessage(error, "Student banavta problem aavi.");
  if (message.toLowerCase().includes("invalid api key")) {
    return "Invalid API key: Railway ma SUPABASE_SERVICE_ROLE_KEY ni value Supabase Project Settings > API mathi service_role key sathe replace karo.";
  }
  return message;
}

function isPhoneAuthConfigError(error: unknown) {
  const message = toMessage(error, "").toLowerCase();
  return (
    message.includes("phone") &&
    (message.includes("provider") || message.includes("disabled") || message.includes("unsupported"))
  );
}

function normalizeMessage(value: unknown) {
  if (typeof value !== "string") return null;
  const message = value.trim();
  if (!message || message === "{}" || message === "[]") return null;
  return message;
}

export async function createStudent(input: CreateStudentInput): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const email = input.email.trim().toLowerCase();
    const phone = normalizePhoneNumber(input.phone);

    if (!email || !input.password || input.password.length < 6) {
      return { ok: false, message: "Email ane 6+ char password aapo." };
    }

    if (!phone) {
      return { ok: false, message: "Valid mobile number aapo. India mate 10 digit number chale." };
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return { ok: false, message: "Aa email par student pachi thi exist kare chhe." };
    }

    const { data: existingPhone } = await admin
      .from("profiles")
      .select("id")
      .in("phone", phoneLookupValues(input.phone))
      .limit(1)
      .maybeSingle();

    if (existingPhone) {
      return { ok: false, message: "Aa mobile number par student pachi thi exist kare chhe." };
    }

    let { data, error } = await admin.auth.admin.createUser({
      email,
      phone,
      password: input.password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { full_name: input.full_name, phone, role: "student" },
    });

    if (error && isPhoneAuthConfigError(error)) {
      const retry = await admin.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: { full_name: input.full_name, phone, role: "student" },
      });
      data = retry.data;
      error = retry.error;
    }

    if (error || !data.user) {
      return {
        ok: false,
        message: createUserMessage(error),
      };
    }

    const { error: profileUpsertError } = await admin.from("profiles").upsert(
      {
        id: data.user.id,
        full_name: input.full_name || null,
        email,
        phone,
        role: "student",
      },
      { onConflict: "id" }
    );

    if (profileUpsertError) {
      return {
        ok: true,
        message: `Student account bane gayo, pan profile sync fail: ${toMessage(profileUpsertError, "Unknown error")}`,
      };
    }

    if (input.batchId) {
      const { error: enrErr } = await admin.from("enrollments").upsert(
        { student_id: data.user.id, batch_id: input.batchId },
        { onConflict: "student_id,batch_id", ignoreDuplicates: true }
      );

      if (enrErr) {
        return {
          ok: true,
          message: `Student bane gayo, pan batch enrollment fail: ${toMessage(enrErr, "Unknown error")}`,
        };
      }
    }

    revalidatePath("/admin/students");
    return { ok: true, message: "Student successfully add thai gayo." };
  } catch (error) {
    return {
      ok: false,
      message: toMessage(error, "Student create karva ma unknown error aavi."),
    };
  }
}

export async function updateStudent(input: UpdateStudentInput): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    const email = input.email.trim().toLowerCase();
    const phone = normalizePhoneNumber(input.phone);
    const password = input.password?.trim() || null;

    if (!input.id) {
      return { ok: false, message: "Student select karo." };
    }

    if (!email || !email.includes("@")) {
      return { ok: false, message: "Valid email aapo." };
    }

    if (!phone) {
      return { ok: false, message: "Valid mobile number aapo. India mate 10 digit number chale." };
    }

    if (password && password.length < 6) {
      return { ok: false, message: "Password ochama 6 character hovu joiye." };
    }

    const { data: student } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", input.id)
      .eq("role", "student")
      .maybeSingle();

    if (!student) {
      return { ok: false, message: "Student maleo nahi." };
    }

    const { data: existingEmail } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .neq("id", input.id)
      .maybeSingle();

    if (existingEmail) {
      return { ok: false, message: "Aa email biji account ma use thay chhe." };
    }

    const { data: existingPhone } = await admin
      .from("profiles")
      .select("id")
      .in("phone", phoneLookupValues(input.phone))
      .neq("id", input.id)
      .limit(1)
      .maybeSingle();

    if (existingPhone) {
      return { ok: false, message: "Aa mobile number biji account ma use thay chhe." };
    }

    const authUpdate = {
      email,
      phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: input.full_name,
        phone,
        role: "student",
      },
      ...(password ? { password } : {}),
    };

    let { error: authError } = await admin.auth.admin.updateUserById(input.id, authUpdate);

    if (authError && isPhoneAuthConfigError(authError)) {
      const { error: retryError } = await admin.auth.admin.updateUserById(input.id, {
        email,
        email_confirm: true,
        user_metadata: {
          full_name: input.full_name,
          phone,
          role: "student",
        },
        ...(password ? { password } : {}),
      });
      authError = retryError;
    }

    if (authError) {
      return { ok: false, message: createUserMessage(authError) };
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: input.full_name || null,
        email,
        phone,
        role: "student",
      })
      .eq("id", input.id)
      .eq("role", "student");

    if (profileError) {
      return { ok: false, message: toMessage(profileError, "Student update karva ma problem aavi.") };
    }

    revalidatePath("/admin/students");
    return { ok: true, message: "Student update thai gayo." };
  } catch (error) {
    return { ok: false, message: toMessage(error, "Student update karva ma problem aavi.") };
  }
}

export async function deleteStudent(studentId: string): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    await requireAdmin();
    const admin = createAdminClient();

    if (!studentId) {
      return { ok: false, message: "Student select karo." };
    }

    const { data: student } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", studentId)
      .eq("role", "student")
      .maybeSingle();

    if (!student) {
      return { ok: false, message: "Student maleo nahi." };
    }

    const { error } = await admin.auth.admin.deleteUser(studentId);

    if (error) {
      return { ok: false, message: toMessage(error, "Student delete karva ma problem aavi.") };
    }

    revalidatePath("/admin/students");
    return { ok: true, message: "Student delete thai gayo." };
  } catch (error) {
    return { ok: false, message: toMessage(error, "Student delete karva ma problem aavi.") };
  }
}

export async function assignStudentToBatch(
  studentId: string,
  batchId: string
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireAdmin();
    if (!studentId || !batchId) {
      return { ok: false, message: "Student ane batch select karo." };
    }
    const admin = createAdminClient();
    const { error } = await admin.from("enrollments").upsert(
      { student_id: studentId, batch_id: batchId },
      { onConflict: "student_id,batch_id", ignoreDuplicates: true }
    );
    if (error) {
      return { ok: false, message: toMessage(error, "Batch assign karva ma problem aavi.") };
    }
    revalidatePath("/admin/students");
    return { ok: true, message: "Batch assign thai gayu." };
  } catch (error) {
    return { ok: false, message: toMessage(error, "Batch assign karva ma problem aavi.") };
  }
}

export async function removeStudentFromBatch(
  studentId: string,
  batchId: string
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireAdmin();
    if (!studentId || !batchId) {
      return { ok: false, message: "Student ane batch select karo." };
    }
    const admin = createAdminClient();
    const { error } = await admin
      .from("enrollments")
      .delete()
      .eq("student_id", studentId)
      .eq("batch_id", batchId);
    if (error) {
      return { ok: false, message: toMessage(error, "Batch remove karva ma problem aavi.") };
    }
    revalidatePath("/admin/students");
    return { ok: true, message: "Batch mathi remove thai gayu." };
  } catch (error) {
    return { ok: false, message: toMessage(error, "Batch remove karva ma problem aavi.") };
  }
}

export async function bulkImportStudents(
  batchId: string | null,
  students: BulkStudent[]
): Promise<{ created: number; enrolled: number; failed: number; errors: string[] }> {
  await requireAdmin();
  const admin = createAdminClient();

  let created = 0;
  let enrolled = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const s of students) {
    const email = s.email.trim().toLowerCase();
    const phone = normalizePhoneNumber(s.phone);

    if (!email || !phone || s.password.length < 6) {
      failed++;
      continue;
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      failed++;
      errors.push(`${email}: already exists`);
      continue;
    }

    const { data: existingPhone } = await admin
      .from("profiles")
      .select("id")
      .in("phone", phoneLookupValues(s.phone))
      .limit(1)
      .maybeSingle();

    if (existingPhone) {
      failed++;
      errors.push(`${email}: mobile number already exists`);
      continue;
    }

    let studentId: string | null = null;

    let { data, error } = await admin.auth.admin.createUser({
      email,
      phone,
      password: s.password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { full_name: s.full_name, phone, role: "student" },
    });

    if (error && isPhoneAuthConfigError(error)) {
      const retry = await admin.auth.admin.createUser({
        email,
        password: s.password,
        email_confirm: true,
        user_metadata: { full_name: s.full_name, phone, role: "student" },
      });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      // Kdach pehlethi exist kare — profile dhundi ne enroll karva try karo
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (existing) {
        studentId = existing.id;
      } else {
        failed++;
        errors.push(`${email}: ${createUserMessage(error)}`);
        continue;
      }
    } else if (data.user) {
      studentId = data.user.id;
      created++;

      const { error: profileUpsertError } = await admin.from("profiles").upsert(
        {
          id: studentId,
          full_name: s.full_name || null,
          email,
          phone,
          role: "student",
        },
        { onConflict: "id" }
      );

      if (profileUpsertError) {
        errors.push(
          `${email}: profile sync fail: ${toMessage(profileUpsertError, "Unknown error")}`
        );
      }
    } else {
      failed++;
      errors.push(`${email}: user create response khali aavyo`);
      continue;
    }

    if (studentId && batchId) {
      const { error: enrErr } = await admin
        .from("enrollments")
        .upsert(
          { student_id: studentId, batch_id: batchId },
          { onConflict: "student_id,batch_id", ignoreDuplicates: true }
        );
      if (!enrErr) enrolled++;
    }
  }

  revalidatePath("/admin/students");
  return { created, enrolled, failed, errors };
}
