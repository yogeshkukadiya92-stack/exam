export interface ExpiryAttempt {
  started_at: string;
  exam: { duration_minutes: number; end_time: string | null; timer_mode: string | null; exam_mode: string | null };
}

// Allow the student's final in-flight answer save to reach the server first.
export const SUBMISSION_GRACE_MS = 15000;

export function expiredAttemptReason(attempt: ExpiryAttempt, now: number, activeSeconds = 0) {
  const end = attempt.exam.end_time ? Date.parse(attempt.exam.end_time) : Infinity;
  if (Number.isFinite(end) && now >= end + SUBMISSION_GRACE_MS) return "exam_window_expired";
  const duration = Number(attempt.exam.duration_minutes) * 60000;
  if (!Number.isFinite(duration) || duration <= 0) return null;
  if (attempt.exam.exam_mode === "practical" && attempt.exam.timer_mode === "pausable") {
    return activeSeconds * 1000 >= duration ? "duration_expired" : null;
  }
  const deadline = Date.parse(attempt.started_at) + duration;
  return Number.isFinite(deadline) && now >= deadline + SUBMISSION_GRACE_MS ? "duration_expired" : null;
}
