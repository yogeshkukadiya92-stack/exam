"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

interface BulkStudent {
  full_name: string;
  email: string;
  password: string;
}

interface CreateStudentInput {
  full_name: string;
  email: string;
  password: string;
  batchId?: string | null;
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

    if (!input.email || !input.password || input.password.length < 6) {
      return { ok: false, message: "Email ane 6+ char password aapo." };
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();

    if (existingProfile) {
      return { ok: false, message: "Aa email par student pachi thi exist kare chhe." };
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name, role: "student" },
    });

    if (error || !data.user) {
      return {
        ok: false,
        message: toMessage(error, "Student banavta problem aavi."),
      };
    }

    const { error: profileUpsertError } = await admin.from("profiles").upsert(
      {
        id: data.user.id,
        full_name: input.full_name || null,
        email: input.email,
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
    if (!s.email || s.password.length < 6) {
      failed++;
      continue;
    }

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", s.email)
      .maybeSingle();

    if (existingProfile) {
      failed++;
      errors.push(`${s.email}: already exists`);
      continue;
    }

    let studentId: string | null = null;

    const { data, error } = await admin.auth.admin.createUser({
      email: s.email,
      password: s.password,
      email_confirm: true,
      user_metadata: { full_name: s.full_name, role: "student" },
    });

    if (error) {
      // Kdach pehlethi exist kare — profile dhundi ne enroll karva try karo
      const { data: existing } = await admin
        .from("profiles")
        .select("id")
        .eq("email", s.email)
        .maybeSingle();
      if (existing) {
        studentId = existing.id;
      } else {
        failed++;
        errors.push(`${s.email}: ${error.message}`);
        continue;
      }
    } else {
      studentId = data.user.id;
      created++;

      const { error: profileUpsertError } = await admin.from("profiles").upsert(
        {
          id: studentId,
          full_name: s.full_name || null,
          email: s.email,
          role: "student",
        },
        { onConflict: "id" }
      );

      if (profileUpsertError) {
        errors.push(
          `${s.email}: profile sync fail: ${toMessage(profileUpsertError, "Unknown error")}`
        );
      }
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
