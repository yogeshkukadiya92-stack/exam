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

export async function createStudent(input: CreateStudentInput): Promise<{
  ok: boolean;
  message: string;
}> {
  await requireAdmin();
  const admin = createAdminClient();

  if (!input.email || !input.password || input.password.length < 6) {
    return { ok: false, message: "Email ane 6+ char password aapo." };
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
      message: error?.message ?? "Student banavta problem aavi.",
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
        message: `Student bane gayo, pan batch enrollment fail: ${enrErr.message}`,
      };
    }
  }

  revalidatePath("/admin/students");
  return { ok: true, message: "Student successfully add thai gayo." };
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
