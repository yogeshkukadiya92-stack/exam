import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeAndSubmit } from "@/lib/grade-attempt";
import { expiredAttemptReason, type ExpiryAttempt } from "@/lib/attempt-expiry";

/** Server-owned expiry sweep; does not depend on a student's browser or admin monitor. */
export async function autoSubmitExpiredAttempts() {
  const admin = createAdminClient();
  let cursor: string | null = null;
  for (;;) {
    let query = admin.from("attempts")
      .select("id, started_at, exams!inner(duration_minutes, end_time, timer_mode, exam_mode)")
      .eq("status", "in_progress").order("id").limit(100);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error) throw new Error(`Expiry scan failed: ${error.message}`);
    const attempts = (data ?? []) as unknown as (ExpiryAttempt & { id: string; exams: ExpiryAttempt['exam'] })[];
    if (!attempts.length) break;
    const pausableIds = attempts.filter((attempt) => attempt.exams.exam_mode === "practical" && attempt.exams.timer_mode === "pausable").map((attempt) => attempt.id);
    const active = new Map<string, number>();
    if (pausableIds.length) {
      for (let offset = 0; ; offset += 1000) {
        const { data: sessions, error: sessionError } = await admin.from("attempt_sessions")
          .select("id, attempt_id, started_at, ended_at, last_seen_at").in("attempt_id", pausableIds)
          .order("id").range(offset, offset + 999);
        if (sessionError) throw new Error(`Expiry session scan failed: ${sessionError.message}`);
        for (const session of sessions ?? []) {
          const seconds = Math.max(0, (Date.parse(session.ended_at ?? session.last_seen_at ?? session.started_at) - Date.parse(session.started_at)) / 1000);
          active.set(session.attempt_id, (active.get(session.attempt_id) ?? 0) + seconds);
        }
        if (!sessions || sessions.length < 1000) break;
      }
    }
    // Bound grading load rather than issuing hundreds of writes at once.
    for (let index = 0; index < attempts.length; index += 3) {
      await Promise.all(attempts.slice(index, index + 3).map(async (attempt) => {
        const reason = expiredAttemptReason({ ...attempt, exam: attempt.exams }, Date.now(), active.get(attempt.id) ?? 0);
        if (!reason) return;
        try {
          await gradeAndSubmit(attempt.id, reason);
        } catch (error) {
          // A failed attempt is retried on the next sweep; other students still submit.
          console.error("Automatic exam submission failed", { attemptId: attempt.id, error });
        }
      }));
    }
    cursor = attempts[attempts.length - 1].id;
    if (attempts.length < 100) break;
  }
}
